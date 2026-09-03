"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicPage, { PublicFooter } from "../../components/PublicPage";
import {
  Course,
  fetchLandingCourses,
  formatPrice,
  imageUrl,
  levelLabel,
} from "../../lib/landing";
import { API_LESSONS, API_SECTIONS, readBody } from "../../lib/api";
import { savePendingCourse } from "../../lib/purchase";

type Section = { id: number; name: string; courseId: number };
type Lesson = { id: number; name: string; sectionId: number; description: string };

/* Bo'lim va darslar endpointlari AuthGuard ostida: token bo'lsa kurs dasturi ko'rinadi,
   mehmon foydalanuvchida esa ochiq API yo'q. */
async function fetchProgram(signal?: AbortSignal) {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  if (!token) return { sections: [] as Section[], lessons: [] as Lesson[] };

  const auth = { headers: { Authorization: `Bearer ${token}` }, signal };
  try {
    const [secRes, lesRes] = await Promise.all([
      fetch(`${API_SECTIONS}/all`, auth),
      fetch(`${API_LESSONS}/all`, auth),
    ]);
    if (!secRes.ok || !lesRes.ok) return { sections: [], lessons: [] };

    const secBody = await readBody<{ data?: Section[] }>(secRes);
    const lesBody = await readBody<{ data?: Lesson[] }>(lesRes);
    return {
      sections: Array.isArray(secBody?.data) ? secBody.data : [],
      lessons: Array.isArray(lesBody?.data) ? lesBody.data : [],
    };
  } catch {
    return { sections: [], lessons: [] };
  }
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const courseId = Number(id);

  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /* null — hali tanlanmagan: dizayndagidek birinchi bo'lim ochiq turadi */
  const [openSection, setOpenSection] = useState<number | "none" | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    Promise.all([fetchLandingCourses(ac.signal), fetchProgram(ac.signal)])
      .then(([courseList, program]) => {
        if (ac.signal.aborted) return;
        setCourses(courseList);
        setSections(program.sections);
        setLessons(program.lessons);
        setError("");
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        console.error("Kursni yuklab bo'lmadi", err);
        setError("Ma'lumotlarni yuklab bo'lmadi. Server bilan aloqani tekshiring.");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [courseId]);

  /* ochiq API'da faqat /course/all bor (one/:id admin uchun), shuning uchun ro'yxatdan tanlaymiz */
  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  );

  const activeCourses = useMemo(
    () => courses.filter((c) => c.status === "ACTIVE"),
    [courses],
  );

  const navCourses = useMemo(
    () => activeCourses.map((c) => ({ id: c.id, name: c.name })),
    [activeCourses],
  );

  const courseSections = useMemo(
    () => sections.filter((s) => s.courseId === courseId),
    [sections, courseId],
  );

  const lessonsOf = useCallback(
    (sectionId: number) => lessons.filter((l) => l.sectionId === sectionId),
    [lessons],
  );

  const lessonCount = useMemo(
    () => courseSections.reduce((sum, s) => sum + lessonsOf(s.id).length, 0),
    [courseSections, lessonsOf],
  );

  /* bosilganda so'rov yuborilmaydi: kurs eslab qolinadi va ro'yxatdan o'tishga o'tadi */
  const handleBuy = () => {
    if (!course) return;
    savePendingCourse(course.id);
    router.push(`/register?courseId=${course.id}`);
  };

  const activeSection =
    openSection === null
      ? (courseSections[0]?.id ?? null)
      : openSection === "none"
        ? null
        : openSection;

  return (
    <PublicPage courses={navCourses} coursesLoading={loading}>
      <style>{STYLES}</style>

      {loading && (
        <div className="c-state">
          <span className="c-spin" /> Yuklanmoqda…
        </div>
      )}

      {!loading && (error || !course) && (
        <div className="c-state">
          <p>{error || "Bunday kurs topilmadi."}</p>
          <Link href="/#kurslar" className="btn btn-primary">
            Kurslarga qaytish
          </Link>
        </div>
      )}

      {!loading && !error && course && (
        <>
          <section className="c-hero">
            <div className="container">
              <div className="c-hero-text">
                <h1 className="c-title">{course.name}</h1>
                <p className="c-desc">{course.description}</p>

                <div className="c-meta">
                  <span className="c-meta-item">
                    <IconBars /> Daraja: {levelLabel(course.level)}
                  </span>
                  {lessonCount > 0 && (
                    <span className="c-meta-item">
                      <IconPlaySmall /> {lessonCount} ta dars
                    </span>
                  )}
                  {courseSections.length > 0 && (
                    <span className="c-meta-item">
                      <IconLayers /> {courseSections.length} ta bo&apos;lim
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="container c-wrap">
            <div className="c-main">
              {/* ---- kurs dasturi ---- */}
              <div className="c-card c-program">
                {courseSections.length === 0 ? (
                  <>
                    <div className="c-program-head">Kurs dasturi</div>
                    <p className="c-empty">
                      Dastur ma&apos;lumotlari hozircha mavjud emas.
                    </p>
                  </>
                ) : (
                  courseSections.map((section) => {
                    const open = activeSection === section.id;
                    const items = lessonsOf(section.id);

                    return (
                      <div className="c-acc" key={section.id}>
                        <button
                          className="c-acc-head"
                          aria-expanded={open}
                          onClick={() => setOpenSection(open ? "none" : section.id)}
                        >
                          <span>{section.name}</span>
                          <span className={open ? "c-caret up" : "c-caret"}>
                            <IconCaret />
                          </span>
                        </button>

                        {open && (
                          <div className="c-acc-body">
                            {items.length === 0 ? (
                              <p className="c-empty small">Bu bo&apos;limda dars yo&apos;q</p>
                            ) : (
                              items.map((lesson) => (
                                <div className="c-lesson" key={lesson.id}>
                                  <span className="c-lock">
                                    <IconLock />
                                  </span>
                                  <span className="c-lesson-name">{lesson.name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* ---- muhokamalar ---- */}
              <div className="c-card c-comments">
                <div className="c-comments-head">Muhokamalar</div>
                <div className="c-comment-box">
                  <Image
                    className="c-avatar"
                    src="/avatar.svg"
                    alt=""
                    width={34}
                    height={34}
                  />
                  <input
                    className="c-comment-input"
                    placeholder="Fikringizni yozib qoldiring"
                    disabled
                  />
                  <span className="c-send">
                    <IconSend />
                  </span>
                </div>
                {/* izohlar uchun backendda endpoint yo'q */}
                <p className="c-empty small">Izohlar tez orada</p>
              </div>
            </div>

            <aside className="c-side">
              <div className="c-card c-buy">
                <div className="c-buy-banner">
                  {course.banner ? (
                    <Image
                      src={imageUrl(course.banner)}
                      alt={course.name}
                      width={420}
                      height={230}
                      unoptimized
                    />
                  ) : (
                    <div className="c-buy-empty">IT Live</div>
                  )}
                </div>

                <div className="c-buy-body">
                  <div className="c-price">
                    {formatPrice(course.price)} <span>UZS</span>
                  </div>
                  <p className="c-buy-desc">{course.description}</p>
                  <span className="c-level">{levelLabel(course.level)}</span>

                  <button className="btn btn-dark c-buy-btn" onClick={handleBuy}>
                    Sotib olish
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <PublicFooter introVideo={course.intro_video} />
        </>
      )}
    </PublicPage>
  );
}

/* ---------- ikonkalar ---------- */

function IconBars() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 10v3M8 6v7M13 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconPlaySmall() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.6 5.6l4 2.4-4 2.4z" fill="currentColor" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2l6 3-6 3-6-3 6-3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2 11l6 3 6-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function IconCaret() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 5.5 7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.2" y="7" width="9.6" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12l16-7-7 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- uslublar ---------- */

const STYLES = `
.c-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; min-height: 60vh; color: var(--muted); font-size: 15px;
}
.c-spin {
  width: 26px; height: 26px; border-radius: 50%;
  border: 3px solid var(--border); border-top-color: var(--primary);
  animation: c-spin .7s linear infinite;
}
@keyframes c-spin { to { transform: rotate(360deg); } }

/* ---- hero ---- */
.c-hero { background: var(--primary); color: #fff; padding: 46px 0; min-height: 262px; }
.c-hero-text { max-width: 700px; }
.c-title { font-size: 40px; font-weight: 800; letter-spacing: -.6px; margin-bottom: 14px; }
.c-desc { font-size: 16px; opacity: .92; margin-bottom: 22px; }
.c-meta { display: flex; flex-wrap: wrap; gap: 26px; font-size: 14px; opacity: .95; }
.c-meta-item { display: inline-flex; align-items: center; gap: 8px; }

/* ---- ustunlar: yon karta ko'k maydonga chiqib turadi ---- */
.c-wrap {
  display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 28px;
  align-items: start; margin-top: 26px; padding-bottom: 70px;
}
.c-main { display: flex; flex-direction: column; gap: 22px; }
/* yon ustun ko'k maydon ustiga chiqib turadi */
.c-side { margin-top: -222px; display: flex; flex-direction: column; gap: 20px; }

.c-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; box-shadow: var(--shadow); overflow: hidden;
}

/* ---- kurs dasturi ---- */
.c-program { padding: 6px 0; }
.c-program-head { padding: 16px 22px 4px; font-size: 16px; font-weight: 700; }
.c-acc + .c-acc { border-top: 1px solid var(--border); }
.c-acc-head {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 16px 22px; background: none; border: none; cursor: pointer;
  font: inherit; font-size: 14.5px; font-weight: 600; color: var(--text); text-align: left;
}
.c-acc-head:hover { color: var(--primary); }
.c-caret { display: inline-flex; color: var(--muted); transition: transform .18s; }
.c-caret.up { transform: rotate(180deg); }
.c-acc-body { padding: 0 22px 10px; }
.c-lesson {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-top: 1px solid var(--border); font-size: 14px; color: var(--text);
}
.c-lock {
  width: 26px; height: 26px; border-radius: 50%; flex: none;
  background: var(--bg-soft); color: var(--muted);
  display: inline-flex; align-items: center; justify-content: center;
}
.c-lesson-name { flex: 1; }
.c-empty { padding: 14px 22px 20px; color: var(--muted); font-size: 14px; }
.c-empty.small { padding: 14px 0 4px; font-size: 13.5px; }

/* ---- muhokamalar ---- */
.c-comments { padding: 20px 22px 22px; }
.c-comments-head { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.c-comment-box { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
.c-avatar { border-radius: 50%; flex: none; }
.c-comment-input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font: inherit; font-size: 14px; color: var(--text);
}
.c-comment-input::placeholder { color: var(--muted); }
.c-send { color: var(--muted); display: inline-flex; }

/* ---- sotib olish kartasi ---- */
.c-buy-banner { height: 190px; background: var(--bg-soft); }
.c-buy-banner img { width: 100%; height: 100%; object-fit: cover; display: block; }
.c-buy-empty {
  display: flex; align-items: center; justify-content: center; height: 100%;
  color: var(--muted); font-weight: 700; letter-spacing: 1px;
}
.c-buy-body { padding: 18px 20px 22px; display: flex; flex-direction: column; gap: 12px; }
.c-price { font-size: 26px; font-weight: 800; }
.c-price span { font-size: 15px; font-weight: 700; color: var(--muted); }
.c-buy-desc { font-size: 13.5px; color: var(--muted); }
.c-level {
  align-self: flex-start; padding: 5px 12px; border-radius: 20px;
  background: var(--primary-soft); color: var(--primary); font-size: 12.5px; font-weight: 600;
}
.c-buy-btn { width: 100%; height: 46px; }

@media (max-width: 1000px) {
  .c-hero { padding: 40px 0; min-height: 0; }
  .c-title { font-size: 30px; }
  .c-wrap { grid-template-columns: 1fr; margin-top: 24px; padding-bottom: 50px; }
  .c-main { order: 2; }
  .c-side { order: 1; margin-top: 0; }
}
`;
