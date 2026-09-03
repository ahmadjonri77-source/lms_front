"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "../components/DashboardShell";
import CourseModal, { LEVELS, type Course } from "../components/CourseModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import AssignAssistantModal from "../components/AssignAssistantModal";
import {
  API_ASSISTANTS,
  API_CATEGORIES,
  API_COURSES,
  API_MENTORS,
  API_SECTIONS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

const COLUMNS = [
  { key: "check", label: "" },
  { key: "banner", label: "Banner", filter: true },
  { key: "name", label: "Kurs nomi", filter: true },
  { key: "sections", label: "Bo'limlar", filter: true },
  { key: "level", label: "Darajasi", filter: true },
  { key: "price", label: "Narxi", filter: true },
  { key: "category", label: "Kategoriya", sortable: true },
  { key: "status", label: "Holati", filter: true },
  { key: "actions", label: "Amallar" },
];

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(
  LEVELS.map((l) => [l.value, l.label]),
);

type Category = { id: number; name: string };
type Section = { id: number; name: string; courseId: number };
/* profileId — mentorlar uchun: kursdagi `mentorId` aynan mentor profili id'si */
type Person = { id: number; name: string; profileId?: number };

/* mentor/assistent ro'yxatlari: ism `full_name`, ro'yxat esa `data` yoki `message` ichida keladi */
type PersonBody = { data?: RawPerson[]; message?: RawPerson[] };
type RawPerson = {
  id: number;
  full_name?: string;
  name?: string;
  mentorProfiles?: { id: number } | null;
};

function pickPeople(b: PersonBody | null): Person[] {
  const list = Array.isArray(b?.data) ? b.data : Array.isArray(b?.message) ? b.message : [];
  return list.map((p) => ({
    id: p.id,
    name: p.full_name ?? p.name ?? String(p.id),
    profileId: p.mentorProfiles?.id,
  }));
}

/* "250000" -> "250 000" (Decimal string sifatida keladi) */
function formatPrice(raw: string) {
  const [int, dec] = String(raw ?? "").split(".");
  if (!int) return "-";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec && Number(dec) > 0 ? `${grouped}.${dec}` : grouped;
}

/* "2026-08-12T11:01:12.818Z" -> "12.08.2026 11:01:12" (UTC, hydration xavfsiz) */
function formatDate(iso: string) {
  if (!iso) return "-";
  const [date, time = ""] = String(iso).split("T");
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y} ${time.slice(0, 8)}`.trim();
}

type LoadResult =
  | { kind: "ok"; rows: Course[] }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

async function fetchCourses(token: string): Promise<LoadResult> {
  const res = await fetch(`${API_COURSES}/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // backend kurslar ro'yxatini `message` ichida qaytaradi
  const body = await readBody<{ message?: Course[]; data?: Course[] } & ApiError>(res);

  if (!res.ok) {
    if (isAuthError(res, body)) return { kind: "unauthorized" };
    return {
      kind: "error",
      message: errorMessage(body, "Ma'lumotlarni yuklab bo'lmadi"),
    };
  }

  const rows = Array.isArray(body?.message)
    ? body.message
    : Array.isArray(body?.data)
      ? body.data
      : [];
  return { kind: "ok", rows };
}

/* 1 2 3 ... 15 ko'rinishidagi qisqa sahifa ro'yxati */
function pageList(total: number, current: number): (number | "dots")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "dots", total];
  if (current >= total - 3)
    return [1, "dots", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "dots", current - 1, current, current + 1, "dots", total];
}

const SortIcon = () => (
  <svg className="sort" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M8 10l4-4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 14l4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

/* kurs bo'limlari ro'yxati — "Batafsil" tugmasi ochadi */
function SectionsModal({
  course,
  sections,
  onClose,
}: {
  course: Course;
  sections: Section[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="v-ov" onClick={onClose}>
      <div className="v-md" onClick={(e) => e.stopPropagation()}>
        <div className="v-head">
          <div className="v-title">Bo&apos;limlar</div>
          <button className="v-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="v-row">
          <div className="v-k">Kurs</div>
          <div className="v-v">{course.name}</div>
        </div>

        {sections.length === 0 ? (
          <p className="v-empty">Bu kursda bo&apos;lim yo&apos;q</p>
        ) : (
          <ol className="sec-list">
            {sections.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* kurs tafsilotlari */
function ViewModal({
  course,
  categoryName,
  mentorName,
  assistantName,
  sectionCount,
  onClose,
  onEdit,
  onDelete,
  onAssign,
}: {
  course: Course;
  categoryName: string;
  mentorName: string;
  assistantName: string;
  sectionCount: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* assistent biriktirilmagan bo'lsa — qiymat o'rniga "Biriktirish" tugmasi */
  const assistantCell = course.assistantId ? (
    <div className="v-assist">
      <span className="v-v">{assistantName}</span>
      <button className="v-assign link" onClick={onAssign}>
        O&apos;zgartirish
      </button>
    </div>
  ) : (
    <button className="v-assign" onClick={onAssign}>
      Biriktirish
    </button>
  );

  const info: { k: string; v: React.ReactNode }[] = [
    { k: "Darajasi", v: LEVEL_LABEL[course.level] ?? course.level },
    { k: "Narxi", v: `${formatPrice(course.price)} so'm` },
    { k: "Sana", v: formatDate(course.create_at) },
    { k: "Kategoriya", v: categoryName },
    { k: "Mentor", v: mentorName },
    { k: "Assistent", v: assistantCell },
    { k: "Bo'limlar soni", v: String(sectionCount) },
    { k: "Holati", v: course.status === "ACTIVE" ? "Faol" : "Nofaol" },
  ];

  return (
    <div className="v-ov" onClick={onClose}>
      <div className="v-md" onClick={(e) => e.stopPropagation()}>
        <div className="v-head plain">
          <div className="v-title">Batafsil</div>

          <div className="v-acts">
            {/* ko'z — intro video bo'lsa ochadi */}
            {course.intro_video ? (
              <a
                className="v-act"
                href={`/uploads/videos/${course.intro_video}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Intro video"
                title="Intro video"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
                    strokeWidth="1.6"
                  />
                  <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
                </svg>
              </a>
            ) : (
              <span className="v-act off" title="Intro video yo'q" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
                    strokeWidth="1.6"
                  />
                  <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
                </svg>
              </span>
            )}

            <button className="v-act" aria-label="Tahrirlash" title="Tahrirlash" onClick={onEdit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M4 20h4L19.5 8.5a2.1 2.1 0 10-3-3L5 17v3z"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              className="v-act danger"
              aria-label="O'chirish"
              title="O'chirish"
              onClick={onDelete}
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
        </div>

        <div className="v-row">
          <div className="v-k">Kurs nomi</div>
          <div className="v-v">{course.name}</div>
        </div>

        <div className="v-banner">
          {course.banner ? (
            <Image
              src={`/uploads/images/${course.banner}`}
              alt=""
              width={640}
              height={200}
              unoptimized
            />
          ) : (
            <div className="ph big" />
          )}
        </div>

        {course.banner && (
          <a
            className="v-file"
            href={`/uploads/images/${course.banner}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M10 13.5a3.6 3.6 0 005.3.4l2.6-2.6a3.6 3.6 0 10-5.1-5.1l-1.4 1.4"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M14 10.5a3.6 3.6 0 00-5.3-.4l-2.6 2.6a3.6 3.6 0 105.1 5.1l1.4-1.4"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            {course.banner}
          </a>
        )}

        <div className="v-grid">
          {info.map(({ k, v }) => (
            <div className="v-row" key={k}>
              <div className="v-k">{k}</div>
              {typeof v === "string" ? <div className="v-v">{v}</div> : v}
            </div>
          ))}
        </div>

        {course.description && (
          <>
            <div className="v-sec">Tavsif</div>
            <p className="v-desc">{course.description}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [mentors, setMentors] = useState<Person[]>([]);
  const [assistants, setAssistants] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [viewing, setViewing] = useState<Course | null>(null);
  const [sectionsOf, setSectionsOf] = useState<Course | null>(null);
  const [assigning, setAssigning] = useState<Course | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // kategoriya va bo'limlar yordamchi ro'yxatlar — xatosi jadvalni to'xtatmaydi
    fetch(`${API_CATEGORIES}/all`, auth)
      .then((r) => readBody<{ data?: Category[] }>(r))
      .then((b) => setCategories(Array.isArray(b?.data) ? b.data : []))
      .catch((e: unknown) => console.error("Kategoriyalarni yuklashda xato", e));

    fetch(`${API_SECTIONS}/all`, auth)
      .then((r) => readBody<{ data?: Section[] }>(r))
      .then((b) => setSections(Array.isArray(b?.data) ? b.data : []))
      .catch((e: unknown) => console.error("Bo'limlarni yuklashda xato", e));

    fetch(`${API_MENTORS}/all`, auth)
      .then((r) => readBody<PersonBody>(r))
      .then((b) => setMentors(pickPeople(b)))
      .catch((e: unknown) => console.error("Mentorlarni yuklashda xato", e));

    fetch(`${API_ASSISTANTS}/all`, auth)
      .then((r) => readBody<PersonBody>(r))
      .then((b) => setAssistants(pickPeople(b)))
      .catch((e: unknown) => console.error("Assistentlarni yuklashda xato", e));

    return fetchCourses(token)
      .then((r) => {
        if (r.kind === "unauthorized") {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        if (r.kind === "error") {
          setCourses([]);
          setError(r.message);
          return;
        }
        setCourses(r.rows);
        setError("");
      })
      .catch((e: unknown) => {
        console.error("Kurslarni yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useCallback(
    (id: number) => categories.find((c) => c.id === id)?.name ?? "-",
    [categories],
  );

  /* kursdagi mentorId — profil id'si; ro'yxatdagi user esa `profileId` orqali topiladi */
  const mentorOf = useCallback(
    (profileId: number) =>
      mentors.find((m) => m.profileId === profileId) ??
      mentors.find((m) => m.id === profileId),
    [mentors],
  );

  const mentorName = useCallback(
    (profileId: number) => mentorOf(profileId)?.name ?? "-",
    [mentorOf],
  );

  const assistantName = useCallback(
    (id: number | null) =>
      id == null ? "-" : (assistants.find((a) => a.id === id)?.name ?? "-"),
    [assistants],
  );

  const sectionsOfCourse = useCallback(
    (id: number) => sections.filter((s) => s.courseId === id),
    [sections],
  );

  const handleDelete = async (c: Course) => {
    const token = localStorage.getItem("token");
    setDeletingId(c.id);
    try {
      const res = await fetch(`${API_COURSES}/${c.id}`, {
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
      setSelected((prev) => prev.filter((id) => id !== c.id));
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      [
        c.name,
        c.description ?? "",
        LEVEL_LABEL[c.level] ?? c.level,
        categoryName(c.categoryId),
        String(c.price),
        String(c.id),
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [courses, search, categoryName]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, total);

  const pageIds = rows.map((c) => c.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggleAll = () =>
    setSelected((prev) =>
      allChecked
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

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
        .crumb { display:flex; align-items:center; gap:10px; margin-top:8px; font-size:14px; color:#475569; }
        .crumb .dot { width:6px; height:6px; border-radius:50%; background:#94A3B8; }

        .btn-add { display:inline-flex; align-items:center; gap:9px; background:#3B82F6; color:#fff; border:none;
                   border-radius:10px; padding:12px 20px; font-size:15px; font-weight:600; cursor:pointer; font-family:inherit;
                   box-shadow:0 2px 8px rgba(59,130,246,.3); white-space:nowrap; }
        .btn-add:hover { background:#2F73E0; }
        .btn-add svg { width:19px; height:19px; }

        .top-row { display:flex; align-items:center; justify-content:space-between; gap:16px;
                   flex-wrap:wrap; margin-bottom:16px; }
        .search-box { position:relative; flex:1; max-width:430px; }
        .search-box input { width:100%; height:46px; background:#fff; border:1px solid #E2E8F0; border-radius:10px;
                            padding:0 44px; font-family:inherit; font-size:15px; color:#0F172A; outline:none; }
        .search-box input::placeholder { color:#94A3B8; }
        .search-box input:focus { border-color:#93C5FD; }
        .search-box .ic-l, .search-box .ic-r { position:absolute; top:50%; transform:translateY(-50%);
                                              width:19px; height:19px; color:#64748B; pointer-events:none; }
        .search-box .ic-l { left:14px; }
        .search-box .ic-r { right:14px; }

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
        table.grid { width:100%; border-collapse:collapse; min-width:1240px; background:#fff; }
        table.grid th { background:#fff; text-align:left; padding:15px 18px; font-size:14px; font-weight:600;
                        color:#0F172A; white-space:nowrap;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid th:last-child { border-right:none; }
        table.grid th .th-in { display:flex; align-items:center; gap:8px; }
        table.grid th .sort, table.grid th .funnel { width:15px; height:15px; color:#94A3B8; margin-left:auto; flex-shrink:0; }
        table.grid td { padding:14px 18px; font-size:14px; color:#334155; white-space:nowrap;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid td:last-child { border-right:none; }
        table.grid tbody tr:last-child td { border-bottom:none; }
        table.grid th.check, table.grid td.check { width:52px; padding-right:0; }
        td.state { text-align:center; color:#64748B; padding:34px 18px; border-right:none; }
        td.state.err { color:#B91C1C; }

        input[type="checkbox"] { width:17px; height:17px; accent-color:#3B82F6; cursor:pointer; }

        .banner-cell { width:74px; height:44px; border-radius:8px; overflow:hidden; background:#E2E8F0; }
        .banner-cell img { width:100%; height:100%; object-fit:cover; }
        .ph { width:100%; height:100%; background:linear-gradient(135deg,#93C5FD,#6366F1); }
        .ph.big { height:180px; border-radius:12px; }

        .cell-name { white-space:normal; min-width:260px; }

        .link-btn { display:inline-flex; align-items:center; gap:8px; background:transparent; border:none; padding:0;
                    font-family:inherit; font-size:14px; color:#334155; cursor:pointer; }
        .link-btn:hover { color:#3B82F6; }
        .link-btn svg { width:17px; height:17px; color:#64748B; }
        .link-btn:hover svg { color:#3B82F6; }

        .badge { display:inline-flex; align-items:center; padding:5px 14px; border-radius:8px; font-size:13px;
                 font-weight:500; }
        .badge.faol { background:#DCFCE7; color:#15803D; }
        .badge.nofaol { background:#FEE2E2; color:#B91C1C; }

        .acts { display:flex; align-items:center; gap:10px; }
        .act { width:32px; height:32px; border:1px solid #E2E8F0; border-radius:8px; background:#fff; cursor:pointer;
               display:inline-flex; align-items:center; justify-content:center; color:#64748B; }
        .act:hover { background:#F8FAFC; color:#0F172A; }
        .act:disabled { opacity:.5; cursor:not-allowed; }
        .act svg { width:16px; height:16px; }

        .sel-bar { display:flex; align-items:center; gap:12px; margin-bottom:12px; font-size:14px; color:#334155; }
        .sel-clear { background:transparent; border:none; padding:0; cursor:pointer; font-family:inherit;
                     font-size:14px; color:#3B82F6; }

        /* modallar */
        .v-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:100;
                display:flex; align-items:center; justify-content:center; padding:24px; }
        .v-md { background:#fff; border-radius:16px; width:100%; max-width:680px; padding:24px 30px 28px;
                box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
        .v-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                  padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:20px; }
        /* tafsilot oynasida ajratuvchi chiziq yo'q */
        .v-head.plain { border-bottom:none; padding-bottom:0; margin-bottom:18px; }
        .v-title { font-size:22px; font-weight:700; color:#0F172A; }
        .v-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
               color:#0F172A; display:inline-flex; }
        .v-x:hover { background:#F1F5F9; }
        .v-x svg { width:22px; height:22px; }

        .v-acts { display:flex; align-items:center; gap:10px; }
        .v-act { width:38px; height:38px; border-radius:50%; border:none; background:#F1F5F9;
                 color:#0F172A; display:inline-flex; align-items:center; justify-content:center;
                 cursor:pointer; text-decoration:none; flex:none; }
        .v-act:hover { background:#E2E8F0; }
        .v-act svg { width:19px; height:19px; }
        .v-act.danger:hover { background:#FEE2E2; color:#DC2626; }
        .v-act.off { background:#F8FAFC; color:#CBD5E1; cursor:default; }

        .v-banner { border-radius:12px; overflow:hidden; margin:14px 0 12px; background:#E2E8F0; }
        .v-banner img { width:100%; height:200px; object-fit:cover; display:block; }

        .v-file { display:inline-flex; align-items:center; gap:10px; margin-bottom:20px;
                  font-size:15px; font-weight:600; color:#0F172A; text-decoration:none;
                  word-break:break-all; }
        .v-file:hover { text-decoration:underline; }
        .v-file svg { width:20px; height:20px; color:#3B82F6; flex:none; }

        .v-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; }

        .v-assist { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:2px; }
        .v-assign { margin-top:4px; height:36px; padding:0 18px; background:#3B82F6; color:#fff;
                    border:none; border-radius:8px; cursor:pointer; font-family:inherit;
                    font-size:14px; font-weight:600; }
        .v-assign:hover { background:#2F73E0; }
        .v-assign.link { margin-top:0; height:auto; padding:0; background:transparent; color:#3B82F6;
                         font-size:13.5px; font-weight:500; text-decoration:underline; }
        .v-assign.link:hover { background:transparent; color:#2F73E0; }

        .v-sec { font-size:16px; font-weight:700; color:#0F172A; padding-bottom:12px;
                 border-bottom:1px solid #E2E8F0; margin:22px 0 14px; }
        .v-row { margin-bottom:12px; }
        .v-grid .v-row { margin-bottom:6px; }
        .v-k { font-size:14px; color:#94A3B8; }
        .v-v { font-size:16px; font-weight:700; color:#0F172A; margin-top:2px; word-break:break-word; }
        .v-desc { font-size:15px; color:#334155; line-height:1.6; }
        .v-empty { font-size:15px; color:#64748B; }

        .sec-list { margin:12px 0 0; padding-left:22px; font-size:15px; color:#0F172A; line-height:2; }

        @media (max-width: 700px) {
          .v-md { padding:20px 18px 22px; }
          .v-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Kurslar</div>
          <div className="crumb">
            <span>Kurslar</span>
            <i className="dot" />
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
          Qo&apos;shish
        </button>
      </div>

      <div className="top-row">
        <div className="search-box">
          <svg className="ic-l" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Izlash"
          />
          <svg className="ic-r" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M5 7h14M8 12h8M10.5 17h3"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <Pager {...pagerProps} />
      </div>

      {selected.length > 0 && (
        <div className="sel-bar">
          <span>{selected.length} ta kurs tanlandi</span>
          <button className="sel-clear" onClick={() => setSelected([])}>
            Bekor qilish
          </button>
        </div>
      )}

      <div className="table-card">
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                {COLUMNS.map((c) =>
                  c.key === "check" ? (
                    <th key={c.key} className="check">
                      <input
                        type="checkbox"
                        aria-label="Hammasini tanlash"
                        checked={allChecked}
                        onChange={toggleAll}
                      />
                    </th>
                  ) : (
                    <th key={c.key}>
                      <div className="th-in">
                        {c.label}
                        {c.filter && (
                          <svg className="funnel" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 5h18l-7 8v6l-4 2v-8z" />
                          </svg>
                        )}
                        {c.sortable && !c.filter && <SortIcon />}
                      </div>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="state" colSpan={COLUMNS.length}>
                    Yuklanmoqda...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td className="state err" colSpan={COLUMNS.length}>
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td className="state" colSpan={COLUMNS.length}>
                    Ma&apos;lumot topilmadi
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                rows.map((c) => (
                  <tr key={c.id}>
                    <td className="check">
                      <input
                        type="checkbox"
                        aria-label={`${c.name} ni tanlash`}
                        checked={selected.includes(c.id)}
                        onChange={() => toggleOne(c.id)}
                      />
                    </td>
                    <td>
                      <div className="banner-cell">
                        {c.banner ? (
                          <Image
                            src={`/uploads/images/${c.banner}`}
                            alt=""
                            width={74}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className="ph" />
                        )}
                      </div>
                    </td>
                    <td className="cell-name">{c.name}</td>
                    <td>
                      <button className="link-btn" onClick={() => setSectionsOf(c)}>
                        Batafsil
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
                          <path d="M12 11v5.5" strokeWidth="1.7" strokeLinecap="round" />
                          <circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </button>
                    </td>
                    <td>{LEVEL_LABEL[c.level] ?? c.level}</td>
                    <td>{formatPrice(c.price)}</td>
                    <td>{categoryName(c.categoryId)}</td>
                    <td>
                      <span className={`badge ${c.status === "ACTIVE" ? "faol" : "nofaol"}`}>
                        {c.status === "ACTIVE" ? "Faol" : "Nofaol"}
                      </span>
                    </td>
                    <td>
                      <div className="acts">
                        <button
                          className="act"
                          aria-label="Ko'rish"
                          onClick={() => setViewing(c)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
                              strokeWidth="1.6"
                            />
                            <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
                          </svg>
                        </button>
                        <button
                          className="act"
                          aria-label="Tahrirlash"
                          onClick={() => {
                            setEditing(c);
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
                          disabled={deletingId === c.id}
                          onClick={() => setPendingDelete(c)}
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
        <CourseModal
          key={editing ? `edit-${editing.id}` : "create"}
          course={editing}
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

      {viewing && (
        <ViewModal
          course={viewing}
          categoryName={categoryName(viewing.categoryId)}
          mentorName={mentorName(viewing.mentorId)}
          assistantName={assistantName(viewing.assistantId)}
          sectionCount={sectionsOfCourse(viewing.id).length}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setModalOpen(true);
          }}
          onDelete={() => {
            setPendingDelete(viewing);
            setViewing(null);
          }}
          onAssign={() => setAssigning(viewing)}
        />
      )}

      {assigning && (
        <AssignAssistantModal
          course={assigning}
          assistants={assistants}
          mentorUserId={mentorOf(assigning.mentorId)?.id ?? null}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setViewing(null);
            setLoading(true);
            load();
          }}
          onUnauthorized={() => {
            setAssigning(null);
            router.push("/login");
          }}
        />
      )}

      {sectionsOf && (
        <SectionsModal
          course={sectionsOf}
          sections={sectionsOfCourse(sectionsOf.id)}
          onClose={() => setSectionsOf(null)}
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
