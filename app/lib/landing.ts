/* Landing sahifasi uchun ochiq (token talab qilmaydigan) API'lar va yordamchilar */

import { API_CATEGORIES, API_COURSES, API_MENTORS, readBody } from "./api";

/* Guard'siz endpoint'lar: mehmon foydalanuvchi ham ko'ra oladi */
export const API_COURSES_PUBLIC = `${API_COURSES}/all`;
export const API_MENTORS_PUBLIC = `${API_MENTORS}/all/landing`;
/* Bu esa AuthGuard ostida — token bo'lmasa 401 qaytadi, shuning uchun ixtiyoriy */
export const API_CATEGORIES_ALL = `${API_CATEGORIES}/all`;

export type CourseLevel =
  | "BEGINNER"
  | "ELEMENTERIY"
  | "PREINTERMEDIA"
  | "INTERMEDIATE"
  | "ADVANCED";

export type Course = {
  id: number;
  assistantId: number | null;
  mentorId: number;
  name: string;
  banner: string | null;
  intro_video: string | null;
  description: string;
  price: string | number;
  categoryId: number;
  status: "ACTIVE" | "INACTIVE" | "FREEZE";
  level: CourseLevel | string;
  create_at: string;
  update_at: string;
};

export type LandingMentor = {
  id: number;
  file: string | null;
  full_name: string;
};

export type Category = {
  id: number;
  name: string;
};

/* GET /course/all -> {success, message: [...]}, GET /mentor/all/landing -> {success, data: [...]} */
type CoursesResponse = { success?: boolean; message?: Course[] };
type MentorsResponse = { success?: boolean; data?: LandingMentor[] };
type CategoriesResponse = {
  success?: boolean;
  data?: Category[];
  message?: Category[];
};

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Boshlang'ich",
  ELEMENTERIY: "Elementar",
  PREINTERMEDIA: "O'rta oldi",
  INTERMEDIATE: "O'rta",
  ADVANCED: "Yuqori",
};

export function levelLabel(level: string) {
  return LEVEL_LABELS[level] ?? level;
}

/* 250000 -> "250 000" */
export function formatPrice(price: string | number) {
  const num = Number(price);
  if (!Number.isFinite(num)) return String(price ?? "");
  const [whole, fraction] = String(num).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fraction ? `${grouped},${fraction}` : grouped;
}

/* backend fayllarni /uploads ostida beradi (next.config rewrite orqali proksilanadi) */
export function imageUrl(file: string | null | undefined, fallback = "/avatar.svg") {
  return file ? `/uploads/images/${file}` : fallback;
}

export async function fetchLandingCourses(signal?: AbortSignal): Promise<Course[]> {
  const res = await fetch(API_COURSES_PUBLIC, { signal });
  const body = await readBody<CoursesResponse>(res);
  if (!res.ok) throw new Error("Kurslarni yuklab bo'lmadi");
  return body?.message ?? [];
}

export async function fetchLandingMentors(signal?: AbortSignal): Promise<LandingMentor[]> {
  const res = await fetch(API_MENTORS_PUBLIC, { signal });
  const body = await readBody<MentorsResponse>(res);
  if (!res.ok) throw new Error("Mentorlarni yuklab bo'lmadi");
  return body?.data ?? [];
}

/* Kategoriyalar endpoint'i ADMIN/SUPERADMIN uchun yopiq.
   Token bo'lsa nomlarni olamiz, bo'lmasa landing daraja bo'yicha filtrlaydi. */
export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("token");
  if (!token) return [];

  try {
    const res = await fetch(API_CATEGORIES_ALL, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) return [];
    const body = await readBody<CategoriesResponse>(res);
    return body?.data ?? body?.message ?? [];
  } catch {
    return [];
  }
}
