import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "@knu_read_status_v1";

type ReadStatusContextValue = {
  ready: boolean;
  isRead: (detailUrl: string) => boolean;
  markAsRead: (detailUrl: string) => void;
  clearAll: () => void;
};

const ReadStatusContext = createContext<ReadStatusContextValue | null>(null);

export function ReadStatusProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [readUrls, setReadUrls] = useState<Set<string>>(new Set());

  // 최초 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: string[] = raw ? JSON.parse(raw) : [];
        setReadUrls(new Set(Array.isArray(parsed) ? parsed : []));
      } catch {
        setReadUrls(new Set());
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readUrls))).catch(
      () => {},
    );
  }, [ready, readUrls]);

  const isRead = useCallback(
    (detailUrl: string) => readUrls.has(detailUrl),
    [readUrls],
  );

  const markAsRead = useCallback((detailUrl: string) => {
    if (!detailUrl) return;
    setReadUrls((prev) => {
      const next = new Set(prev);
      next.add(detailUrl);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setReadUrls(new Set()), []);

  const value = useMemo(
    () => ({
      ready,
      isRead,
      markAsRead,
      clearAll,
    }),
    [ready, isRead, markAsRead, clearAll],
  );

  return (
    <ReadStatusContext.Provider value={value}>
      {children}
    </ReadStatusContext.Provider>
  );
}

export function useReadStatus() {
  const ctx = useContext(ReadStatusContext);
  if (!ctx)
    throw new Error("useReadStatus must be used within ReadStatusProvider");
  return ctx;
}

export default ReadStatusProvider;
