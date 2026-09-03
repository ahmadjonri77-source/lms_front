"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "../components/DashboardShell";
import MentorModal, { type Mentor } from "../components/MentorModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  API_COURSES,
  API_MENTORS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

const COLUMNS = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "F.I.Sh", sortable: true, filter: true },
  { key: "phone", label: "Telefon raqam", sortable: true },
  { key: "createdAt", label: "Yaratilgan vaqt", sortable: true },
  { key: "role", label: "Rol", sortable: true },
  { key: "status", label: "Holat", sortable: false, filter: true },
  { key: "actions", label: "Amallar", sortable: false },
];

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Mentor",
  ADMIN: "Administrator",
  SUPERADMIN: "Super administrator",
};

/* "+998975661091" -> "+998 97 566 10 91" */
function formatPhone(raw: string) {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length !== 12) return raw;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
}

/* "2026-08-12T11:01:12.818Z" -> "2026-08-12 11:01:12" (UTC, hydration xavfsiz) */
function formatDate(iso: string) {
  if (!iso) return "-";
  return iso.replace("T", " ").slice(0, 19);
}

function avatarOf(file: string | null) {
  return file ? `/uploads/images/${file}` : "/avatar.svg";
}

type LoadResult =
  | { kind: "ok"; rows: Mentor[] }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

async function fetchMentors(token: string): Promise<LoadResult> {
  const res = await fetch(`${API_MENTORS}/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await readBody<{ data?: Mentor[] } & ApiError>(res);

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

const SortIcon = () => (
  <svg className="sort" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M8 10l4-4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 14l4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Toolbar({
  total,
  from,
  to,
  pageCount,
  perPage,
  onPerPage,
  page,
  onPage,
}: {
  total: number;
  from: number;
  to: number;
  pageCount: number;
  perPage: number;
  onPerPage: (n: number) => void;
  page: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="toolbar">
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
    </div>
  );
}

/* havolani to'g'ri URL ga aylantirish: "@user" -> t.me/user, "sayt.uz" -> https://sayt.uz */
function linkHref(kind: string, raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) {
    if (kind === "telegram") return `https://t.me/${v.slice(1)}`;
    if (kind === "instagram") return `https://instagram.com/${v.slice(1)}`;
    if (kind === "github") return `https://github.com/${v.slice(1)}`;
  }
  return `https://${v}`;
}

const BrandFacebook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 10-1.2 20v-7H8.4V12h2.4V9.8c0-2.4 1.4-3.7 3.5-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v7A10 10 0 0012 2z" />
  </svg>
);

const BrandTelegram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 6.9l-1.6 7.6c-.1.5-.5.7-.9.4l-2.5-1.9-1.2 1.2c-.1.1-.3.2-.4.2l.2-2.6 4.8-4.3c.2-.2 0-.3-.3-.1l-5.9 3.7-2.5-.8c-.6-.2-.6-.6.1-.8l9.6-3.7c.5-.2.9.1.6.9z" />
  </svg>
);

const BrandInstagram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
    <path d="M8 2h8a6 6 0 016 6v8a6 6 0 01-6 6H8a6 6 0 01-6-6V8a6 6 0 016-6zm4 5.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6zm0 2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6zM17.6 5.6a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" />
  </svg>
);

const BrandLinkedin = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
    <path d="M4.5 3h15A1.5 1.5 0 0121 4.5v15A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3zM8 10H5.7v8H8v-8zM6.8 6.4a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8zM18.3 18v-4.4c0-2.3-1.2-3.4-2.9-3.4-1.3 0-1.9.7-2.2 1.2V10h-2.4v8h2.4v-4.3c0-1.1.2-2.2 1.6-2.2 1.3 0 1.4 1.3 1.4 2.3V18h2.1z" />
  </svg>
);

const BrandGithub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
    <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.8-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.8 1 1.7 1 2.8 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v3c0 .3.2.6.7.5 3.9-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2z" />
  </svg>
);

const SOCIAL_LINKS = [
  { key: "facebook", Icon: BrandFacebook },
  { key: "telegram", Icon: BrandTelegram },
  { key: "instagram", Icon: BrandInstagram },
  { key: "linkedin", Icon: BrandLinkedin },
  { key: "github", Icon: BrandGithub },
] as const;

type ApiCourse = { id: number; name: string; mentorId: number };

/* mentor tafsilotlari; kurslar ro'yxati alohida so'rov bilan olinadi */
function ViewModal({
  mentor,
  onClose,
  onEdit,
}: {
  mentor: Mentor;
  onClose: () => void;
  onEdit: () => void;
}) {
  const p = mentor.mentorProfiles;
  const profileId = p?.id;
  const [courses, setCourses] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!profileId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_COURSES}/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => readBody<{ message?: ApiCourse[]; data?: ApiCourse[] }>(r))
      .then((b) => {
        // backend kurslar ro'yxatini `message` ichida qaytaradi
        const list = Array.isArray(b?.message)
          ? b.message
          : Array.isArray(b?.data)
            ? b.data
            : [];
        setCourses(list.filter((c) => c.mentorId === profileId).map((c) => c.name));
      })
      .catch((e: unknown) => console.error("Kurslarni yuklashda xato", e));
  }, [profileId]);

  const info: [string, string][] = [
    ["Telefon raqami", mentor.phone || "-"],
    ["Rol", ROLE_LABEL[mentor.role] ?? mentor.role],
    ["Ro'yxatdan o'tgan vaqti", formatDate(mentor.create_at)],
    ["Ish tajribasi", p?.experience != null ? `${p.experience} yil` : "-"],
    ["Kasbi:", p?.job || "-"],
  ];

  const portfolio = linkHref("web", p?.web_link ?? "");

  return (
    <div className="v-ov" onClick={onClose}>
      <div className="v-md" onClick={(e) => e.stopPropagation()}>
        <div className="v-head">
          <div className="v-title">Mentor haqida</div>
          <button className="v-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="v-user">
          <div className="v-av">
            <Image src={avatarOf(mentor.file)} alt="" width={76} height={76} unoptimized />
          </div>
          <div>
            <div className="v-name">{mentor.full_name}</div>
            <div className="v-job">{p?.job || "-"}</div>
          </div>
        </div>

        <div className="v-sec">To&apos;liq ma&apos;lumotlar</div>
        {info.map(([k, v]) => (
          <div className="v-row" key={k}>
            <div className="v-k">{k}</div>
            <div className="v-v">{v}</div>
          </div>
        ))}

        <div className="v-sec">Kurslar</div>
        <div className="v-row">
          <div className="v-k">Nomi</div>
          <div className="v-v">{courses.length ? courses.join(", ") : "-"}</div>
        </div>

        {p?.description && (
          <>
            <div className="v-sec">Ma&apos;lumot</div>
            <p className="v-desc">{p.description}</p>
          </>
        )}

        <div className="v-sec">Ijtimoiy tarmoq sahifalari:</div>
        <div className="v-foot">
          <div className="v-socials">
            {SOCIAL_LINKS.map(({ key, Icon }) => {
              const href = linkHref(key, (p?.[key] as string | null | undefined) ?? "");
              if (!href) return null;
              return (
                <a
                  key={key}
                  className="v-soc"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={key}
                >
                  <Icon />
                </a>
              );
            })}
            {portfolio && (
              <a className="v-soc v-portfolio" href={portfolio} target="_blank" rel="noreferrer">
                Portfolio
              </a>
            )}
          </div>

          <button className="v-edit" onClick={onEdit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M4 20h4L19.5 8.5a2.1 2.1 0 10-3-3L5 17v3z"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            Tahrirlash
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MentorsPage() {
  const router = useRouter();
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mentor | null>(null);
  const [viewing, setViewing] = useState<Mentor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mentor | null>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    return fetchMentors(token)
      .then((r) => {
        if (r.kind === "unauthorized") {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        if (r.kind === "error") {
          setMentors([]);
          setError(r.message);
          return;
        }
        setMentors(r.rows);
        setError("");
      })
      .catch((e: unknown) => {
        console.error("Mentorlarni yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (m: Mentor) => {
    const token = localStorage.getItem("token");
    setDeletingId(m.id);
    try {
      const res = await fetch(`${API_MENTORS}/${m.id}`, {
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter((m) =>
      [m.full_name, m.phone, m.email ?? "", m.mentorProfiles?.job ?? "", String(m.id)]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [mentors, search]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, total);

  const runSearch = () => {
    setSearch(query);
    setPage(1);
  };

  const toolbarProps = {
    total,
    from,
    to,
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

        .search-row { display:flex; align-items:center; gap:14px; margin:18px 0; }
        .search-box { position:relative; flex:1; max-width:430px; }
        .search-box input { width:100%; height:46px; background:#fff; border:1px solid #E2E8F0; border-radius:10px;
                            padding:0 44px; font-family:inherit; font-size:15px; color:#0F172A; outline:none; }
        .search-box input::placeholder { color:#94A3B8; }
        .search-box input:focus { border-color:#93C5FD; }
        .search-box .ic-l, .search-box .ic-r { position:absolute; top:50%; transform:translateY(-50%);
                                              width:19px; height:19px; color:#64748B; pointer-events:none; }
        .search-box .ic-l { left:14px; }
        .search-box .ic-r { right:14px; }
        .btn-search { height:46px; padding:0 26px; background:#3B82F6; color:#fff; border:none; border-radius:10px;
                      font-family:inherit; font-size:15px; font-weight:600; cursor:pointer; }
        .btn-search:hover { background:#2F73E0; }

        .table-card { background:#fff; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; }
        .table-wrap { overflow-x:auto; }
        table.grid { width:100%; border-collapse:collapse; min-width:1150px; background:#fff; }
        table.grid th { background:#fff; text-align:left; padding:15px 18px; font-size:14px; font-weight:600;
                        color:#0F172A; white-space:nowrap;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid th:last-child { border-right:none; }
        table.grid th .th-in { display:flex; align-items:center; gap:8px; }
        table.grid th .sort, table.grid th .funnel { width:15px; height:15px; color:#94A3B8; margin-left:auto; flex-shrink:0; }
        table.grid td { padding:16px 18px; font-size:14px; color:#334155; white-space:nowrap;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid td:last-child { border-right:none; }
        table.grid tbody tr:last-child td { border-bottom:none; }
        td.state { text-align:center; color:#64748B; padding:34px 18px; border-right:none; }
        td.state.err { color:#B91C1C; }

        .cell-user { display:flex; align-items:center; gap:12px; }
        .cell-user .av { width:30px; height:30px; border-radius:50%; overflow:hidden; flex-shrink:0; }
        .cell-user .av img { width:100%; height:100%; object-fit:cover; }

        .badge { display:inline-flex; align-items:center; padding:5px 14px; border-radius:8px; font-size:13px; font-weight:500; }
        .badge.faol { background:#DCFCE7; color:#15803D; }
        .badge.nofaol { background:#FEE2E2; color:#B91C1C; }

        .acts { display:flex; align-items:center; gap:10px; }
        .act { width:32px; height:32px; border:1px solid #E2E8F0; border-radius:8px; background:#fff; cursor:pointer;
               display:inline-flex; align-items:center; justify-content:center; color:#64748B; }
        .act:hover { background:#F8FAFC; color:#0F172A; }
        .act:disabled { opacity:.5; cursor:not-allowed; }
        .act svg { width:16px; height:16px; }

        /* ko'rish modali */
        .v-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:100;
                display:flex; align-items:center; justify-content:center; padding:24px; }
        .v-md { background:#fff; border-radius:16px; width:100%; max-width:760px; padding:24px 30px 28px;
                box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
        .v-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                  padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:20px; }
        .v-title { font-size:22px; font-weight:700; color:#0F172A; }
        .v-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
               color:#0F172A; display:inline-flex; }
        .v-x:hover { background:#F1F5F9; }
        .v-x svg { width:22px; height:22px; }

        .v-user { display:flex; align-items:center; gap:18px; margin-bottom:24px; }
        .v-av { width:76px; height:76px; border-radius:50%; overflow:hidden; flex-shrink:0;
                border:1px solid #E2E8F0; }
        .v-av img { width:100%; height:100%; object-fit:cover; }
        .v-name { font-size:22px; font-weight:700; color:#0F172A; letter-spacing:-.2px; }
        .v-job { font-size:15px; color:#64748B; margin-top:4px; }

        .v-sec { font-size:16px; font-weight:700; color:#0F172A; padding-bottom:12px;
                 border-bottom:1px solid #E2E8F0; margin:22px 0 14px; }
        .v-row { margin-bottom:12px; }
        .v-k { font-size:14px; color:#94A3B8; }
        .v-v { font-size:16px; font-weight:700; color:#0F172A; margin-top:2px; word-break:break-word; }
        .v-desc { font-size:15px; color:#334155; line-height:1.6; }

        .v-foot { display:flex; align-items:center; justify-content:space-between; gap:16px;
                  flex-wrap:wrap; margin-top:4px; }
        .v-socials { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .v-soc { width:56px; height:56px; border-radius:12px; background:#F1F5F9; color:#0F172A;
                 display:inline-flex; align-items:center; justify-content:center; text-decoration:none;
                 transition:background .15s; }
        .v-soc:hover { background:#E2E8F0; }
        .v-soc svg { width:28px; height:28px; }
        .v-portfolio { width:auto; padding:0 24px; font-size:15px; font-weight:600; }

        .v-edit { display:inline-flex; align-items:center; gap:10px; height:52px; padding:0 22px;
                  background:#fff; border:1px solid #E2E8F0; border-radius:12px; cursor:pointer;
                  font-family:inherit; font-size:15px; font-weight:600; color:#0F172A; }
        .v-edit:hover { background:#F8FAFC; }
        .v-edit svg { width:19px; height:19px; }

        @media (max-width: 700px) { .v-md { padding:20px 18px 22px; } }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Mentorlar</div>
          <div className="crumb">
            <span>Foydalanuvchilar</span>
            <i className="dot" />
            <span>Mentorlar</span>
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

      <Toolbar {...toolbarProps} />

      <div className="search-row">
        <div className="search-box">
          <svg className="ic-l" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Izlash..."
          />
          <svg className="ic-r" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <button className="btn-search" onClick={runSearch}>
          Izlash
        </button>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
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
                ))}
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
                rows.map((m) => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>
                      <div className="cell-user">
                        <div className="av">
                          <Image
                            src={avatarOf(m.file)}
                            alt=""
                            width={30}
                            height={30}
                            unoptimized
                          />
                        </div>
                        <span>{m.full_name}</span>
                      </div>
                    </td>
                    <td>{formatPhone(m.phone)}</td>
                    <td>{formatDate(m.create_at)}</td>
                    <td>{ROLE_LABEL[m.role] ?? m.role}</td>
                    <td>
                      <span className={`badge ${m.status === "ACTIVE" ? "faol" : "nofaol"}`}>
                        {m.status === "ACTIVE" ? "Faol" : "Nofaol"}
                      </span>
                    </td>
                    <td>
                      <div className="acts">
                        <button
                          className="act"
                          aria-label="Ko'rish"
                          onClick={() => setViewing(m)}
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
                            setEditing(m);
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
                          disabled={deletingId === m.id}
                          onClick={() => setPendingDelete(m)}
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

      <div style={{ marginTop: 18 }}>
        <Toolbar {...toolbarProps} />
      </div>

      {modalOpen && (
        <MentorModal
          key={editing ? `edit-${editing.id}` : "create"}
          mentor={editing}
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

      {viewing && (
        <ViewModal
          mentor={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setModalOpen(true);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.full_name}
          loading={deletingId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      )}
    </DashboardShell>
  );
}
