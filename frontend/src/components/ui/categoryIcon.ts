import type { IconType } from "react-icons";
import {
  LuGraduationCap,
  LuHandHeart,
  LuHeartPulse,
  LuLeaf,
  LuLifeBuoy,
  LuPalette,
  LuPawPrint,
  LuUsers,
} from "react-icons/lu";

/** Khớp theo cụm từ trong slug danh mục (vd. `y-te-cuu-tro-benh-nhan`); cụm đứng trước được ưu tiên. */
const RULES: [keyword: string, icon: IconType][] = [
  ["y-te", LuHeartPulse],
  ["giao-duc", LuGraduationCap],
  ["moi-truong", LuLeaf],
  ["dong-vat", LuPawPrint],
  ["cuu-tro", LuLifeBuoy],
  ["thien-tai", LuLifeBuoy],
  ["tre-em", LuUsers],
  ["cong-dong", LuUsers],
  ["sang-tao", LuPalette],
];

export function categoryIcon(slug: string | undefined): IconType {
  const padded = `-${(slug ?? "").toLowerCase()}-`;
  return RULES.find(([k]) => padded.includes(`-${k}-`))?.[1] ?? LuHandHeart;
}
