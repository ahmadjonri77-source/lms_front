/* Talaba uchun "Mening kurslarim": backendda maxsus /course/my endpoint yo'q.
   GET /course/all/buy (guardsiz, filtrlanmagan) dan joriy user'ga tegishli
   yozuvlarni ajratib, GET /course/all bilan kurs ma'lumotiga bog'laymiz,
   mentorni esa GET /mentor/all/landing dan qidiramiz. */

import { API_COURSES, readBody } from "./api";
import { decodeToken } from "./auth";
import {
  fetchLandingCourses,
  fetchLandingMentors,
  type Course,
  type LandingMentor,
} from "./landing";

export const API_COURSES_BUY = `${API_COURSES}/all/buy`;

export type AssignedCourse = {
  id: number;
  userId: number;
  coursesId: number;
  status: "ACTIVE" | "INACTIVE" | "FREEZE";
  create_at: string;
  update_at: string;
};

type AssignedCoursesResponse = {
  success?: boolean;
  data?: AssignedCourse[];
  message?: AssignedCourse[];
};

/* GET /course/all include: { categories: true } qiladi — landing.ts'dagi
   Course tipida bu maydon yo'q, shuning uchun shu yerda kengaytiramiz */
export type CourseWithCategory = Course & {
  categories?: { id: number; name: string } | null;
};

export type MyCourse = {
  course: CourseWithCategory;
  mentor: LandingMentor | null;
};

async function fetchAssignedCourses(): Promise<AssignedCourse[]> {
  const res = await fetch(API_COURSES_BUY);
  const body = await readBody<AssignedCoursesResponse>(res);
  if (!res.ok) throw new Error("Biriktirilgan kurslarni yuklab bo'lmadi");

  const rows = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.message)
      ? body.message
      : [];
  return rows;
}

export async function fetchMyCourses(token: string): Promise<MyCourse[]> {
  const payload = decodeToken(token);
  if (!payload) throw new Error("Token yaroqsiz");

  const [assigned, courses, mentors] = await Promise.all([
    fetchAssignedCourses(),
    fetchLandingCourses(),
    fetchLandingMentors(),
  ]);

  const myCourseIds = new Set(
    assigned
      .filter((a) => a.userId === payload.id && a.status === "ACTIVE")
      .map((a) => a.coursesId),
  );

  return courses
    .filter((c) => myCourseIds.has(c.id))
    .map((course) => ({
      course,
      mentor: mentors.find((m) => m.id === course.mentorId) ?? null,
    }));
}
