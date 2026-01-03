import { Ionicons } from "@expo/vector-icons";

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type RankItem = {
  id: string;
  keyword: string;
};

export { Category, RankItem };

