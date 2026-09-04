"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/DashboardShell";
import HomeworkModal, { type Homework } from "../../components/HomeworkModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import type { Lesson } from "../../components/LessonModal";
import {
  API_COURSES,
  API_HOMEWORKS,
  API_LESSONS,
  API_SECTIONS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../../lib/api";

type Section = { id: number; name: string; courseId: number };
type Course = { id: number; name: string };
type Tab = "materials" | "homeworks" | "exams";

const TABS: { key: Tab; label: string }[] = [
  { key: "materials", label: "Materiallar" },
  { key: "homeworks", label: "Vazifalar" },
  { key: "exams", label: "Imtihonlar" },
];

/* Backendda hozircha faqat lesson/section/homework moduli bor:
   material va imtihon uchun endpoint yo'q, shuning uchun ular bo'sh holatda turadi */
const NO_API: Record<Tab, string> = {
  materials:
    "Materiallar uchun backendda endpoint yo'q (materials moduli yaratilmagan) — API qo'shilgach shu jadval ishlaydi.",
  homeworks: "",
  exams:
    "Imtihonlar uchun backendda endpoint yo'q (Exam modeli bor, controller yo'q) — API qo'shilgach shu jadval ishlaydi.",
};

/* rasm o'z kengaytmasi bilan, video esa .mp4 nomi bilan saqlanadi */
function homeworkFileUrl(file: string) {
  return file.toLowerCase().endsWith(".mp4")
    ? `/uploads/videos/${file}`
    : `/uploads/images/${file}`;
}

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const lessonId = Number(id);

  const [tab, setTab] = useState<Tab>("materials");

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Homework | null>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // breadcrumb uchun yordamchi ro'yxatlar
    fetch(`${API_SECTIONS}/all`, auth)
      .then((r) => readBody<{ data?: Section[] }>(r))
      .then((b) => setSections(Array.isArray(b?.data) ? b.data : []))
      .catch((e: unknown) => console.error("Bo'limlarni yuklashda xato", e));

    fetch(`${API_COURSES}/all`, auth)
      .then((r) => readBody<{ message?: Course[]; data?: Course[] }>(r))
      .then((b) =>
        setCourses(
          Array.isArray(b?.message) ? b.message : Array.isArray(b?.data) ? b.data : [],
        ),
      )
      .catch((e: unknown) => console.error("Kurslarni yuklashda xato", e));

    return Promise.all([
      fetch(`${API_LESSONS}/one/${lessonId}`, auth).then(async (r) => ({
        res: r,
        body: await readBody<{ data?: Lesson } & ApiError>(r),
      })),
      fetch(`${API_HOMEWORKS}/all`, auth).then(async (r) => ({
        res: r,
        body: await readBody<{ data?: Homework[] } & ApiError>(r),
      })),
    ])
      .then(([one, all]) => {
        if (isAuthError(one.res, one.body) || isAuthError(all.res, all.body)) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (!one.res.ok) {
          setError(errorMessage(one.body, "Darsni yuklab bo'lmadi"));
          return;
        }

        setLesson(one.body?.data ?? null);
        setHomeworks(
          Array.isArray(all.body?.data)
            ? all.body.data.filter((h) => h.lessonId === lessonId)
            : [],
        );
        setError("");
      })
      .catch((e: unknown) => {
        console.error("Dars ma'lumotlarini yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (h: Homework) => {
    const token = localStorage.getItem("token");
    setDeletingId(h.id);
    try {
      const res = await fetch(`${API_HOMEWORKS}/${h.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const body = await readBody<ApiError>(res);
      if (!res.ok) {
        if (isAuthError(res, body)) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(errorMessage(body, "O'chirib bo'lmadi"));
        return;
      }
      setLoading(true);
      await load();
    } catch (e) {
      console.error("O'chirishda xato", e);
      setError("Server bilan ulanishda xato yuz berdi");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const section = lesson ? sections.find((s) => s.id === lesson.sectionId) : undefined;
  const course = section ? courses.find((c) => c.id === section.courseId) : undefined;

  const isHomeworks = tab === "homeworks";
  const total = isHomeworks ? homeworks.length : 0;
  const from = total === 0 ? 0 : 1;

  return (
    <DashboardShell>
      <style>{`
        .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; }
        .page-title { font-size:23px; font-weight:700; color:#0F172A; letter-spacing:-.2px; }
        .crumb { display:flex; align-items:center; gap:10px; margin-top:8px; font-size:14px; color:#475569; flex-wrap:wrap; }
        .crumb .dot { width:6px; height:6px; border-radius:50%; background:#94A3B8; }
        .crumb .link { background:none; border:none; padding:0; font:inherit; color:#475569; cursor:pointer; }
        .crumb .link:hover { color:#3B82F6; text-decoration:underline; }

        .tabs-row { display:flex; align-items:center; justify-content:space-between; gap:16px;
                    flex-wrap:wrap; margin-bottom:16px; }
        .tabs { display:flex; align-items:center; gap:8px; }
        .tab { height:38px; padding:0 18px; border:1px solid transparent; border-radius:8px; background:transparent;
               font-family:inherit; font-size:14px; font-weight:600; color:#475569; cursor:pointer; }
        .tab:hover { background:#EEF2F7; }
        .tab.active { background:#3B82F6; color:#fff; }

        .btn-add { display:inline-flex; align-items:center; gap:9px; background:#12B76A; color:#fff; border:none;
                   border-radius:10px; padding:11px 20px; font-size:15px; font-weight:600; cursor:pointer; font-family:inherit;
                   box-shadow:0 2px 8px rgba(18,183,106,.3); white-space:nowrap; }
        .btn-add:hover:not(:disabled) { background:#0E9E5B; }
        .btn-add:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; }
        .btn-add svg { width:19px; height:19px; }

        .toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .tb-info { display:flex; align-items:center; gap:16px; font-size:14px; color:#334155; }
        .xls { display:inline-flex; align-items:center; gap:8px; background:transparent; border:none; padding:0; cursor:pointer;
               font-family:inherit; font-size:14px; color:#334155; }
        .xls:hover { color:#0F172A; }
        .xls svg { width:19px; height:19px; }

        .tb-pager { display:flex; align-items:center; gap:4px; font-size:14px; color:#334155; }
        .per-page { display:inline-flex; align-items:center; gap:2px; margin-right:14px; color:#334155; white-space:nowrap; }
        .per-page select { border:none; background:transparent; font-family:inherit; font-size:14px; color:#0F172A;
                           cursor:pointer; outline:none; }
        .pg { min-width:34px; height:34px; padding:0 10px; border:none; background:transparent; border-radius:8px;
              font-family:inherit; font-size:14px; color:#334155; cursor:pointer; }
        .pg.active, .pg.next { background:#fff; color:#0F172A; box-shadow:0 1px 2px rgba(16,24,40,.07); }
        .pg.next { padding:0 16px; }
        .pg:disabled { opacity:.5; cursor:not-allowed; }

        .table-card { background:#fff; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; }
        .table-wrap { overflow-x:auto; }
        table.grid { width:100%; border-collapse:collapse; min-width:900px; background:#fff; }
        table.grid th { background:#fff; text-align:left; padding:15px 18px; font-size:14px; font-weight:600;
                        color:#0F172A; white-space:nowrap;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid th:last-child { border-right:none; }
        table.grid th .th-in { display:flex; align-items:center; gap:8px; }
        table.grid th .funnel { width:15px; height:15px; color:#94A3B8; margin-left:auto; flex-shrink:0; }
        table.grid td { padding:14px 18px; font-size:14px; color:#334155;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid td:last-child { border-right:none; }
        table.grid tbody tr:last-child td { border-bottom:none; }
        td.state { text-align:center; color:#64748B; padding:34px 18px; border-right:none; line-height:1.6; }
        td.state.err { color:#B91C1C; }

        .cell-nowrap { white-space:nowrap; }
        .file-chip { display:inline-flex; align-items:center; gap:8px; padding:5px 12px; border-radius:8px;
                     background:#EFF6FF; color:#1D4ED8; font-size:13px; font-weight:600; text-decoration:none; }
        .file-chip:hover { background:#DBEAFE; }
        .file-chip svg { width:15px; height:15px; }
        .file-none { color:#94A3B8; }

        .acts { display:flex; align-items:center; gap:10px; }
        .act { width:32px; height:32px; border:1px solid #E2E8F0; border-radius:8px; background:#fff; cursor:pointer;
               display:inline-flex; align-items:center; justify-content:center; color:#64748B; }
        .act:hover { background:#F8FAFC; color:#0F172A; }
        .act:disabled { opacity:.5; cursor:not-allowed; }
        .act svg { width:16px; height:16px; }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Darslar</div>
          <div className="crumb">
            <button className="link" onClick={() => router.push("/courses")}>
              Kurslar
            </button>
            <i className="dot" />
            {course && (
              <>
                <span>{course.name}</span>
                <i className="dot" />
              </>
            )}
            <button
              className="link"
              onClick={() =>
                router.push(course ? `/sections?courseId=${course.id}` : "/sections")
              }
            >
              Bo&apos;limlar
            </button>
            <i className="dot" />
            <button className="link" onClick={() => router.push("/lessons")}>
              Darslar
            </button>
            {lesson && (
              <>
                <i className="dot" />
                <span>{lesson.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="tabs-row">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          className="btn-add"
          disabled={!isHomeworks || !lesson}
          title={isHomeworks ? undefined : "Bu bo'lim uchun API hali yo'q"}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
            <path d="M12 8.5v7M8.5 12h7" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Qo&apos;shish
        </button>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>
                  <div className="th-in">Dars</div>
                </th>
                <th>
                  <div className="th-in">
                    {tab === "materials"
                      ? "Material uchun izoh"
                      : tab === "homeworks"
                        ? "Vazifa uchun izoh"
                        : "Savol"}
                    <svg className="funnel" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
                    </svg>
                  </div>
                </th>
                <th>
                  <div className="th-in">
                    Biriktirilgan fayllar
                    <svg className="funnel" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
                    </svg>
                  </div>
                </th>
                <th>
                  <div className="th-in">Amallar</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="state" colSpan={4}>
                    Yuklanmoqda...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td className="state err" colSpan={4}>
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && !isHomeworks && (
                <tr>
                  <td className="state" colSpan={4}>
                    {NO_API[tab]}
                  </td>
                </tr>
              )}

              {!loading && !error && isHomeworks && homeworks.length === 0 && (
                <tr>
                  <td className="state" colSpan={4}>
                    Bu darsda vazifa yo&apos;q
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                isHomeworks &&
                homeworks.map((h) => (
                  <tr key={h.id}>
                    <td className="cell-nowrap">{lesson?.name ?? "-"}</td>
                    <td>{h.description}</td>
                    <td>
                      {h.file ? (
                        <a
                          className="file-chip"
                          href={homeworkFileUrl(h.file)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M6 3h8l4 4v14H6z" strokeWidth="1.7" strokeLinejoin="round" />
                            <path d="M14 3v4h4" strokeWidth="1.7" strokeLinejoin="round" />
                          </svg>
                          {h.file}
                        </a>
                      ) : (
                        <span className="file-none">-</span>
                      )}
                    </td>
                    <td>
                      <div className="acts">
                        <button
                          className="act"
                          aria-label="Tahrirlash"
                          onClick={() => {
                            setEditing(h);
                            setModalOpen(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              d="M4 20h4L19.5 8.5a2.1 2.1 0 10-3-3L5 17v3z"
                              strokeWidth="1.6"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="act"
                          aria-label="O'chirish"
                          disabled={deletingId === h.id}
                          onClick={() => setPendingDelete(h)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 18 }}>
        <div className="tb-info">
          <span>
            Sahifada {from}-{total} gacha. Umumiy {total}ta
          </span>
          <button className="xls">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#1D6F42" />
              <path
                d="M8.6 8.2l6.8 7.6M15.4 8.2l-6.8 7.6"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            ({total}) Yuklab olish .XLS
          </button>
        </div>

        <div className="tb-pager">
          <label className="per-page">
            Bir sahifada:
            <select defaultValue={10} disabled>
              <option value={10}>10</option>
            </select>
          </label>
          <button className="pg active">1</button>
          <button className="pg next" disabled>
            Keyingi
          </button>
        </div>
      </div>

      {modalOpen && lesson && (
        <HomeworkModal
          key={editing ? `edit-${editing.id}` : "create"}
          homework={editing}
          lessons={[{ id: lesson.id, name: lesson.name }]}
          presetLessonId={lesson.id}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setLoading(true);
            load();
          }}
          onUnauthorized={() => {
            setModalOpen(false);
            router.push("/login");
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.description}
          loading={deletingId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      )}
    </DashboardShell>
  );
}
