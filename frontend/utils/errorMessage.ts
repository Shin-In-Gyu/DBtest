/**
 * 기술적인 에러 객체를 사용자에게 보여줄 한글 메시지로 변환합니다.
 * "cannot read property 'map' of undefined" 같은 문구는 노출하지 않습니다.
 */
export function toUserFriendlyMessage(error: unknown): string {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const m = msg.toLowerCase();

  // .map / .filter / .find 등 of undefined
  if (
    /\.(map|filter|find|forEach|reduce|some|every)\s+of\s+undefined/i.test(msg) ||
    /cannot read propert(y|ies).*of undefined/i.test(m) ||
    /undefined is not an object/i.test(m)
  ) {
    return "데이터를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }

  // 네트워크 / fetch / 연결
  if (
    /network|fetch|failed to fetch|network request failed/i.test(m) ||
    /typeerror: network request failed/i.test(m) ||
    /internet|offline|connection/i.test(m)
  ) {
    return "인터넷 연결을 확인해 주세요.";
  }

  // 타임아웃
  if (/timeout|timed out/i.test(m)) {
    return "요청이 오래 걸려 중단됐어요. 다시 시도해 주세요.";
  }

  // 4xx/5xx
  if (/요청 실패\s*\(\s*5\d{2}/i.test(msg) || /500|502|503|504/i.test(msg)) {
    return "서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.";
  }
  if (/요청 실패\s*\(\s*4\d{2}/i.test(msg) || /\b4\d{2}\b/.test(msg)) {
    return "요청을 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
  }

  // 그 외 이미 한글로 된 짧은 문장은 그대로 (예: "오류가 발생했습니다.")
  if (/^[가-힣\s\d.,!?]+$/.test(msg) && msg.length <= 80) {
    return msg;
  }

  // 나머지 (영문 기술 에러 등)
  // 에러 코드 추출 시도
  let errorCode = "";
  if (typeof error === "object" && error !== null) {
    if ("code" in error) {
      errorCode = String(error.code);
    } else if ("status" in error) {
      errorCode = String(error.status);
    } else if ("statusCode" in error) {
      errorCode = String(error.statusCode);
    }
  }
  
  const codeSuffix = errorCode ? ` (코드: ${errorCode})` : "";
  return `일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.${codeSuffix}`;
}
