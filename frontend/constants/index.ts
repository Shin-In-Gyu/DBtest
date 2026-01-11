import { Category } from "@/types";

const colors = {
  KNU: "#006DB8",
  WHITE: "#fff",
  BLACK: "#000",
};

const category: { general: Category[]; dept: Category[] } = {
  general: [
    { id: "c1", label: "학사", icon: "school-outline" },
    { id: "c2", label: "취창업", icon: "briefcase-outline" },
    { id: "c3", label: "국제", icon: "earth-outline" },
    { id: "c4", label: "장학", icon: "ribbon-outline" },
    { id: "c5", label: "도서관", icon: "library-outline" },
    { id: "c6", label: "학생", icon: "leaf-outline" },
    { id: "c7", label: "산학", icon: "flask-outline" },
    { id: "c8", label: "일반", icon: "document-text-outline" },
  ],
  dept: [
    { id: "d1", label: "컴공", icon: "laptop-outline" },
    { id: "d2", label: "공지", icon: "megaphone-outline" },
    { id: "d3", label: "세미나", icon: "people-outline" },
  ],
};

export { category, colors };

