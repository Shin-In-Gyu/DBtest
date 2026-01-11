import { getKnuNoticeDetail } from "@/api/knuNotice";
import { useQuery } from "@tanstack/react-query";

export function useKnuNoticeDetail(detailUrl: string | null) {
  return useQuery({
    queryKey: ["knuNoticeDetail", detailUrl],
    queryFn: () => getKnuNoticeDetail(detailUrl as string),
    enabled: !!detailUrl,
    staleTime: 60_000, // 1분 정도 캐싱(원하면 늘려도 됨)
  });
}
