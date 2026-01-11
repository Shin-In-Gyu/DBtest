import type { BookmarkItem, NoticeListItem } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "@knu_bookmarks_v1";

type BookmarksContextValue = {
  ready: boolean;
  bookmarks: BookmarkItem[];
  isBookmarked: (detailUrl: string) => boolean;
  toggleBookmark: (item: NoticeListItem, sourceKey: string) => void;
  removeBookmark: (detailUrl: string) => void;
  clearAll: () => void;
};

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  // 최초 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: BookmarkItem[] = raw ? JSON.parse(raw) : [];
        setBookmarks(Array.isArray(parsed) ? parsed : []);
      } catch {
        setBookmarks([]);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)).catch(
      () => {},
    );
  }, [ready, bookmarks]);

  const isBookmarked = useCallback(
    (detailUrl: string) => bookmarks.some((b) => b.detailUrl === detailUrl),
    [bookmarks],
  );

  const removeBookmark = useCallback((detailUrl: string) => {
    setBookmarks((prev) => prev.filter((b) => b.detailUrl !== detailUrl));
  }, []);

  const toggleBookmark = useCallback(
    (item: NoticeListItem, sourceKey: string) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.detailUrl === item.detailUrl);
        if (exists) {
          return prev.filter((b) => b.detailUrl !== item.detailUrl);
        }
        const next: BookmarkItem = {
          ...item, // ✅ 전체 필드 저장 (category, date, views 등)
          sourceKey,
          savedAt: Date.now(),
        };
        // 최신 북마크가 위로
        return [next, ...prev];
      });
    },
    [],
  );

  const clearAll = useCallback(() => setBookmarks([]), []);

  const value = useMemo(
    () => ({
      ready,
      bookmarks,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      clearAll,
    }),
    [ready, bookmarks, isBookmarked, toggleBookmark, removeBookmark, clearAll],
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx)
    throw new Error("useBookmarks must be used within BookmarksProvider");
  return ctx;
}

export default BookmarksProvider;
