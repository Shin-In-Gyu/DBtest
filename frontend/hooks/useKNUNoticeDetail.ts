import { getKnuNoticeDetail, incrementNoticeView } from "@/api/knuNotice";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function useKnuNoticeDetail(params: {
  detailUrl: string | null;
  noticeId?: number; // ✅ 추가
  token?: string; // ✅ 스크랩 표시하려면 추가
}) {
  const { detailUrl, noticeId, token } = params;

  const query = useQuery({
    queryKey: ["knuNoticeDetail", detailUrl, noticeId, token],
    queryFn: () =>
      getKnuNoticeDetail({
        detailUrl: detailUrl as string,
        noticeId,
        token,
      }),
    enabled: !!detailUrl,
    staleTime: 60_000,
  });

  // 조회수 증가를 한 번만 실행하기 위한 ref (noticeId와 dataUpdatedAt 조합)
  const incrementedRef = useRef<{
    noticeId: number;
    dataUpdatedAt: number;
  } | null>(null);

  // 조회수 증가: 상세 정보를 성공적으로 가져온 후 한 번만 호출
  useEffect(() => {
    // fetch가 완료되고, 성공했으며, fetching 중이 아닐 때만 실행
    if (
      query.isFetched &&
      !query.isFetching &&
      query.isSuccess &&
      query.data &&
      noticeId &&
      query.dataUpdatedAt
    ) {
      const key = {
        noticeId,
        dataUpdatedAt: query.dataUpdatedAt,
      };

      // 이미 이 noticeId와 dataUpdatedAt 조합에 대해 조회수를 증가시켰는지 확인
      const alreadyIncremented =
        incrementedRef.current?.noticeId === key.noticeId &&
        incrementedRef.current?.dataUpdatedAt === key.dataUpdatedAt;

      if (!alreadyIncremented) {
        incrementedRef.current = key;
        // 조회수 증가 (비동기, 에러 무시)
        incrementNoticeView(noticeId);
      }
    }
  }, [
    query.isFetched,
    query.isFetching,
    query.isSuccess,
    query.dataUpdatedAt,
    noticeId,
  ]);

  return query;
}
