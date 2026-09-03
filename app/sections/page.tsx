"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "../components/DashboardShell";
import SectionModal, { type Section } from "../components/SectionModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  API_COURSES,
  API_SECTIONS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

type Course = { id: number; name: string };

/* o'chirishda bo'limga bog'langan darslar bo'lsa Prisma xatosi keladi */
function uzMessage(raw: string) {
  if (/foreign key|constraint/i.test(raw))
    return "Bu bo'limga bog'langan darslar bor — avval ularni o'chiring";
  return raw;
}

type LoadResult =
  | { kind: "ok"; rows: Section[] }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

async function fetchSections(token: string): Promise<LoadResult> {
  const res = await fetch(`${API_SECTIONS}/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await readBody<{ data?: Section[] } & ApiError>(res);

  if (!res.ok) {
    if (isAuthError(res, body)) return { kind: "unauthorized" };
    return {
      kind: "error",
      message: errorMessage(body, "Ma'lumotlarni yuklab bo'lmadi"),
    };
  }

  return { kind: "ok", rows: Array.isArray(body?.data) ? body.data : [] };
}

/* 1 2 3 ... 15 ko'rinishidagi qisqa sahifa ro'yxati */
function pageList(total: number, current: number): (number | "dots")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "dots", total];
  if (current >= total - 3)
    return [1, "dots", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "dots", current - 1, current, current + 1, "dots", total];
}

function Pager({
  pageCount,
  perPage,
  onPerPage,
  page,
  onPage,
}: {
  pageCount: number;
  perPage: number;
  onPerPage: (n: number) => void;
  page: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="tb-pager">
      <label className="per-page">
        Bir sahifada:
        <select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </label>

      {pageList(pageCount, page).map((p, i) =>
        p === "dots" ? (
          <span key={`d${i}`} className="pg dots">
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`pg${p === page ? " active" : ""}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="pg next"
        disabled={page >= pageCount}
        onClick={() => onPage(Math.min(page + 1, pageCount))}
      >
        Keyingi
      </button>
    </div>
  );
}

function SectionsView() {
  const router = useRouter();
  const params = useSearchParams();
  /* kurs ichidan kelinganda faqat o'sha kursning bo'limlari ko'rsatiladi */
  const courseParam = Number(params.get("courseId")) || null;

  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Section | null>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // kurslar yordamchi ro'yxat — xatosi jadvalni to'xtatmaydi
    fetch(`${API_COURSES}/all`, auth)
      .then((r) => readBody<{ message?: Course[]; data?: Course[] }>(r))
      .then((b) =>
        setCourses(
          Array.isArray(b?.message) ? b.message : Array.isArray(b?.data) ? b.data : [],
        ),
      )
      .catch((e: unknown) => console.error("Kurslarni yuklashda xato", e));

    return fetchSections(token)
      .then((r) => {
        if (r.kind === "unauthorized") {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        if (r.kind === "error") {
          setSections([]);
          setError(r.message);
          return;
        }
        setSections(r.rows);
        setError("");
      })
      .catch((e: unknown) => {
        console.error("Bo'limlarni yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const courseName = useCallback(
    (id: number) => courses.find((c) => c.id === id)?.name ?? "-",
    [courses],
  );

  const handleDelete = async (s: Section) => {
    const token = localStorage.getItem("token");
    setDeletingId(s.id);
    try {
      const res = await fetch(`${API_SECTIONS}/${s.id}`, {
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
        setError(uzMessage(errorMessage(body, "O'chirib bo'lmadi")));
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

  const filtered = useMemo(
    () => (courseParam ? sections.filter((s) => s.courseId === courseParam) : sections),
    [sections, courseParam],
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, total);

  const pagerProps = {
    pageCount,
    perPage,
    onPerPage: (n: number) => {
      setPerPage(n);
      setPage(1);
    },
    page: current,
    onPage: setPage,
  };

  return (
    <DashboardShell>
      <style>{`
        .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; }
        .page-title { font-size:23px; font-weight:700; color:#0F172A; letter-spacing:-.2px; }
        .crumb { display:flex; align-items:center; gap:10px; margin-top:8px; font-size:14px; color:#475569; flex-wrap:wrap; }
        .crumb .dot { width:6px; height:6px; border-radius:50%; background:#94A3B8; }
        .crumb .link { background:none; border:none; padding:0; font:inherit; color:#475569; cursor:pointer; }
        .crumb .link:hover { color:#3B82F6; text-decoration:underline; }

        .btn-add { display:inline-flex; align-items:center; gap:9px; background:#3B82F6; color:#fff; border:none;
                   border-radius:10px; padding:12px 20px; font-size:15px; font-weight:600; cursor:pointer; font-family:inherit;
                   box-shadow:0 2px 8px rgba(59,130,246,.3); white-space:nowrap; }
        .btn-add:hover { background:#2F73E0; }
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
        .pg:hover { background:#E4EAF1; }
        .pg.active, .pg.next { background:#fff; color:#0F172A; box-shadow:0 1px 2px rgba(16,24,40,.07); }
        .pg.next { padding:0 16px; }
        .pg:disabled { opacity:.5; cursor:not-allowed; }
        .pg:disabled:hover { background:#fff; }
        .pg.dots { color:#94A3B8; cursor:default; display:inline-flex; align-items:center; justify-content:center; }
        .pg.dots:hover { background:transparent; }

        .table-card { background:#fff; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; }
        .table-wrap { overflow-x:auto; }
        table.grid { width:100%; border-collapse:collapse; min-width:640px; background:#fff; }
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
        table.grid th.acts-col, table.grid td.acts-col { width:110px; }
        td.state { text-align:center; color:#64748B; padding:34px 18px; border-right:none; }
        td.state.err { color:#B91C1C; }

        /* bo'lim nomi bosilsa o'sha bo'lim darslari ochiladi */
        .row-link { background:none; border:none; padding:0; font:inherit; color:#0F172A; cursor:pointer;
                    text-align:left; }
        .row-link:hover { color:#3B82F6; text-decoration:underline; }
        .row-sub { display:block; margin-top:3px; font-size:12.5px; color:#94A3B8; }

        .acts { display:flex; align-items:center; gap:10px; }
        .act { width:32px; height:32px; border:1px solid #E2E8F0; border-radius:8px; background:#fff; cursor:pointer;
               display:inline-flex; align-items:center; justify-content:center; color:#64748B; }
        .act:hover { background:#F8FAFC; color:#0F172A; }
        .act:disabled { opacity:.5; cursor:not-allowed; }
        .act svg { width:16px; height:16px; }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Bo&apos;limlar</div>
          <div className="crumb">
            <button className="link" onClick={() => router.push("/courses")}>
              Kurslar
            </button>
            <i className="dot" />
            {courseParam && (
              <>
                <span>{courseName(courseParam)}</span>
                <i className="dot" />
              </>
            )}
            <span>Bo&apos;limlar</span>
          </div>
        </div>

        <button
          className="btn-add"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
            <path d="M12 8.5v7M8.5 12h7" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Bo&apos;lim qo&apos;shish
        </button>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>
                  <div className="th-in">
                    Bo&apos;lim nomi
                    <svg className="funnel" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
                    </svg>
                  </div>
                </th>
                <th className="acts-col">
                  <div className="th-in">Amallar</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="state" colSpan={2}>
                    Yuklanmoqda...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td className="state err" colSpan={2}>
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td className="state" colSpan={2}>
                    Ma&apos;lumot topilmadi
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="row-link"
                        title="Bo'lim darslarini ko'rish"
                        onClick={() => router.push(`/lessons?sectionId=${s.id}`)}
                      >
                        {s.name}
                        {!courseParam && (
                          <span className="row-sub">{courseName(s.courseId)}</span>
                        )}
                      </button>
                    </td>
                    <td className="acts-col">
                      <div className="acts">
                        <button
                          className="act"
                          aria-label="Tahrirlash"
                          onClick={() => {
                            setEditing(s);
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
                          disabled={deletingId === s.id}
                          onClick={() => setPendingDelete(s)}
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
            Sahifada {from}-{to} gacha. Umumiy {total}ta
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

        <Pager {...pagerProps} />
      </div>

      {modalOpen && (
        <SectionModal
          key={editing ? `edit-${editing.id}` : "create"}
          section={editing}
          courses={courses}
          presetCourseId={courseParam}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setLoading(true);
            if (!editing) setPage(1);
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
          name={pendingDelete.name}
          loading={deletingId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      )}
    </DashboardShell>
  );
}

export default function SectionsPage() {
  /* useSearchParams Suspense chegarasini talab qiladi */
  return (
    <Suspense fallback={null}>
      <SectionsView />
    </Suspense>
  );
}
