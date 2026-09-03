/* Kurs sotib olish: POST /course/assignedCourse guardsiz, lekin userId talab qiladi.
   Ro'yxatdan o'tish javobi id qaytarmaydi, shuning uchun tanlangan kurs saqlanadi
   va foydalanuvchi birinchi marta kirganda (token ichidagi id bilan) biriktiriladi. */

import { API_COURSES, errorMessage, readBody, type ApiError } from "./api";

export const API_ASSIGN_COURSE = `${API_COURSES}/assignedCourse`;
const API_LOGIN = "/api/v1/auth/login";

const PENDING_KEY = "pending-course";

export function savePendingCourse(courseId: number) {
  localStorage.setItem(PENDING_KEY, String(courseId));
}

export function readPendingCourse(): number | null {
  if (typeof window === "undefined") return null;
  return Number(localStorage.getItem(PENDING_KEY)) || null;
}

export function clearPendingCourse() {
  localStorage.removeItem(PENDING_KEY);
}

/* accessToken payload: {id, full_name, role} */
export function userIdFromToken(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json) as { id?: number };
    return typeof data.id === "number" ? data.id : null;
  } catch {
    return null;
  }
}

function uzMessage(raw: string) {
  if (/unique constraint|already/i.test(raw))
    return "Bu kurs allaqachon hisobingizga biriktirilgan";
  if (/user not found/i.test(raw)) return "Foydalanuvchi topilmadi";
  if (/course not found/i.test(raw)) return "Kurs topilmadi";
  return raw;
}

export type AssignResult = { ok: true } | { ok: false; message: string };

export async function assignCourse(
  userId: number,
  coursesId: number,
): Promise<AssignResult> {
  const res = await fetch(API_ASSIGN_COURSE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, coursesId }),
  });

  const body = await readBody<ApiError>(res);
  if (!res.ok) {
    return {
      ok: false,
      message: uzMessage(errorMessage(body, "Kursni biriktirib bo'lmadi")),
    };
  }
  return { ok: true };
}

/* login muvaffaqiyatli bo'lgach chaqiriladi — kutib turgan kurs biriktiriladi */
export async function flushPendingCourse(token: string) {
  const coursesId = readPendingCourse();
  if (!coursesId) return;

  const userId = userIdFromToken(token);
  if (!userId) return;

  try {
    const result = await assignCourse(userId, coursesId);
    if (result.ok) {
      clearPendingCourse();
      return;
    }
    // allaqachon biriktirilgan bo'lsa ham qayta urinishning ma'nosi yo'q
    if (/biriktirilgan/.test(result.message)) clearPendingCourse();
    console.error("Kursni biriktirib bo'lmadi:", result.message);
  } catch (e) {
    console.error("Kursni biriktirishda xato", e);
  }
}

/* Ro'yxatdan o'tish javobida id kelsa — o'shani olamiz.
   Hozircha backend faqat {success, message} qaytaradi, id qo'shilsa avtomatik ishlaydi. */
export function userIdFromRegisterResponse(body: unknown): number | null {
  const data = body as
    | { id?: unknown; data?: { id?: unknown }; user?: { id?: unknown } }
    | null;
  const id = data?.id ?? data?.data?.id ?? data?.user?.id;
  return typeof id === "number" ? id : null;
}

/* Javobda id bo'lmasa: yangi ma'lumot bilan login qilib, token payloadidan id olamiz.
   Yangi hisob INACTIVE bo'lgani uchun backend "User not ACTIVE" deb rad etishi mumkin —
   o'shanda null qaytadi va kurs keyingi muvaffaqiyatli kirishda biriktiriladi. */
export async function userIdViaLogin(
  phone: string,
  password: string,
): Promise<number | null> {
  try {
    const res = await fetch(API_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) return null;

    const body = await readBody<{ accessToken?: string }>(res);
    return body?.accessToken ? userIdFromToken(body.accessToken) : null;
  } catch {
    return null;
  }
}
