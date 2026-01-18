# app/services/notification_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.database.models import Device, Keyword, Notice, NotificationHistory
from app.core.logger import get_logger
from collections import defaultdict
import os
import asyncio
import httpx # [추가] HTTP 요청용 (Expo API 호출)

logger = get_logger()
EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send"

# ---------------------------------------------------------
# [헬퍼 함수] 유효하지 않은 토큰 DB 삭제
# ---------------------------------------------------------
async def remove_invalid_tokens(db: AsyncSession, tokens_to_remove: list):
    """전송 실패한 토큰(앱 삭제 등)을 DB에서 제거합니다."""
    if not tokens_to_remove:
        return
    try:
        stmt = delete(Device).where(Device.token.in_(tokens_to_remove))
        await db.execute(stmt)
        await db.commit()
        logger.info(f"🗑️ 유효하지 않은 토큰 {len(tokens_to_remove)}개 삭제 완료")
    except Exception as e:
        logger.error(f"❌ 토큰 삭제 중 오류 발생: {e}")
        await db.rollback()

# ---------------------------------------------------------
# [핵심 로직] 키워드 기반 알림 발송
# ---------------------------------------------------------
async def send_keyword_notifications(db: AsyncSession, new_notices: list):
    """
    [개선된 알림 로직]
    1. is_notified 플래그 활용 (중복 방지)
    2. NotificationHistory 테이블로 발송 이력 추적
    3. 배치 처리 최적화
    4. 에러 핸들링 강화
    """
    if not new_notices:
        logger.info("⏭️ 알림 건너뛰기: 공지 없음")
        return

    # ============================================================
    # 1단계: 알림이 아직 발송되지 않은 공지만 필터링
    # ============================================================
    unnotified_items = [n for n in new_notices if not getattr(n, 'is_notified', False)]
    
    if not unnotified_items:
        logger.info("✅ 모든 공지가 이미 알림 발송됨")
        return
    
    logger.info(f"📬 알림 대상 공지: {len(unnotified_items)}개")

    # ============================================================
    # 2단계: 카테고리별 구독자 조회
    # ============================================================
    target_categories = {n.category for n in unnotified_items if n.category}
    
    if not target_categories:
        logger.warning("⚠️ 알림 대상 카테고리 없음")
        return
    
    try:
        stmt = (
            select(Keyword)
            .where(Keyword.word.in_(target_categories))
            .options(selectinload(Keyword.subscribed_devices))
        )
        result = await db.execute(stmt)
        active_keywords = result.scalars().all()
    except Exception as e:
        logger.error(f"❌ 구독 조회 실패: {e}")
        return

    # 카테고리별 구독자 토큰 매핑
    category_subscribers = defaultdict(list)
    for kw_obj in active_keywords:
        for device in kw_obj.subscribed_devices:
            category_subscribers[kw_obj.word].append({
                "token": device.token,
                "device_id": device.id
            })

    # ============================================================
    # 3단계: 발송 이력 조회 (중복 방지 강화)
    # ============================================================
    notice_ids = [n.id for n in unnotified_items if hasattr(n, 'id') and n.id]
    already_sent = set()
    
    if notice_ids:
        try:
            history_stmt = select(
                NotificationHistory.device_id,
                NotificationHistory.notice_id
            ).where(NotificationHistory.notice_id.in_(notice_ids))
            
            history_result = await db.execute(history_stmt)
            already_sent = {
                (row.device_id, row.notice_id) 
                for row in history_result.all()
            }
            
            if already_sent:
                logger.info(f"🔄 이미 발송된 알림 {len(already_sent)}건 스킵")
        except Exception as e:
            logger.warning(f"⚠️ 발송 이력 조회 실패 (계속 진행): {e}")

    # ============================================================
    # 4단계: 메시지 생성 (중복 제거 강화)
    # ============================================================
    messages_to_send = []
    notification_records = []  # DB 저장용
    
    for notice in unnotified_items:
        # ID가 없는 공지는 건너뛰기
        if not hasattr(notice, 'id') or not notice.id:
            logger.warning(f"⚠️ 공지 ID 없음, 알림 스킵: {notice.title[:30]}")
            continue
            
        subscribers = category_subscribers.get(notice.category, [])
        
        if not subscribers:
            logger.info(f"ℹ️ [{notice.category}] 구독자 없음: {notice.title[:30]}")
            continue
        
        for sub in subscribers:
            device_id = sub["device_id"]
            token = sub["token"]
            
            # 중복 체크: 이미 발송된 조합은 건너뛰기
            if (device_id, notice.id) in already_sent:
                continue
            
            # [수정] Expo Push API 포맷으로 메시지 생성
            messages_to_send.append({
                "to": token,
                "title": f"🔔 [{notice.category}] 새 공지",
                "body": notice.title[:100],
                "data": {
                    "url": str(notice.link),
                    "id": str(notice.id),
                    "category": str(notice.category)
                },
                "sound": "default",
                "badge": 1
            })
            
            # 발송 이력 기록 준비
            notification_records.append({
                "device_id": device_id,
                "notice_id": notice.id
            })
            
            # 중복 방지를 위해 이번 배치에서도 추가
            already_sent.add((device_id, notice.id))
        
        # is_notified 플래그 업데이트
        notice.is_notified = True

    # ============================================================
    # 5단계: 메시지 일괄 전송
    # ============================================================
    if not messages_to_send:
        logger.info("ℹ️ 발송할 메시지 없음 (모두 중복 또는 구독자 없음)")
        try:
            await db.commit()  # is_notified 플래그는 저장
        except:
            await db.rollback()
        return

    batch_size = 500
    loop = asyncio.get_running_loop()
    total_sent = 0
    total_failed = 0
    invalid_tokens = []
    
    logger.info(f"🚀 알림 전송 시작: {len(messages_to_send)}건")

    async with httpx.AsyncClient() as client:
        for i in range(0, len(messages_to_send), batch_size):
            batch = messages_to_send[i:i + batch_size]
            batch_records = notification_records[i:i + batch_size]
            
            try:
                # [수정] Expo Push API 호출
                response = await client.post(EXPO_PUSH_API_URL, json=batch)
                resp_data = response.json()
                
                data_list = resp_data.get("data", [])
                
                successful_records = []
                
                for idx, item in enumerate(data_list):
                    status = item.get("status")
                    if status == "ok":
                        total_sent += 1
                        if idx < len(batch_records):
                            successful_records.append(NotificationHistory(**batch_records[idx]))
                    else:
                        total_failed += 1
                        details = item.get("details", {})
                        if details.get("error") == "DeviceNotRegistered":
                            # 유효하지 않은 토큰 (앱 삭제 등)
                            invalid_token = batch[idx]["to"]
                            invalid_tokens.append(invalid_token)
                
                if successful_records:
                    db.add_all(successful_records)
                    
            except Exception as e:
                logger.error(f"❌ 배치 전송 중 에러: {e}")
                total_failed += len(batch)
    
    # ============================================================
    # 6단계: 정리 작업
    # ============================================================
    
    # 유효하지 않은 토큰 삭제
    if invalid_tokens:
        await remove_invalid_tokens(db, invalid_tokens)
    
    # 최종 커밋
    try:
        await db.commit()
        logger.info(
            f"✅ 알림 발송 완료: "
            f"성공 {total_sent}건, 실패 {total_failed}건, "
            f"유효하지 않은 토큰 {len(invalid_tokens)}개 삭제"
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ 최종 커밋 실패: {e}")
        raise

# ---------------------------------------------------------
# [유틸리티] 특정 기기에 테스트 알림 발송
# ---------------------------------------------------------
async def send_test_notification(token: str, title: str, body: str):
    """테스트용 단일 알림 발송"""
    try:
        message = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_API_URL, json=[message])
            logger.info(f"✅ 테스트 알림 발송 결과: {response.status_code}")
            return response.status_code == 200
        
    except Exception as e:
        logger.error(f"❌ 테스트 알림 발송 실패: {e}")
        return False