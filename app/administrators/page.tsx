"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "../components/DashboardShell";
import AddAdminModal from "../components/AddAdminModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  API_ADMINS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

/* backend GET /api/v1/users/admin qaytaradigan shakl */
type ApiAdmin = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  file: string | null;
  role: string;
  status: string;
  create_at: string;
  update_at: string;
};

const COLUMNS = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "F.I.Sh", sortable: true, filter: true },
  { key: "phone", label: "Telefon raqam", sortable: true },
  { key: "createdAt", label: "Yaratilgan vaqt", sortable: true },
  { key: "role", label: "Rol", sortable: true },
  { key: "status", label: "Holati", sortable: true },
  { key: "actions", label: "Amallar", sortable: false },
];

const ROLE_LABEL: Record<string, string> = {
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
  | { kind: "ok"; rows: ApiAdmin[] }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

async function fetchAdmins(token: string): Promise<LoadResult> {
  const res = await fetch(API_ADMINS, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await readBody<{ data?: ApiAdmin[] } & ApiError>(res);

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
    <path
      d="M8 10l4-4 4 4"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 14l4 4 4-4"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
          >
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

export default function AdministratorsPage() {
  const router = useRouter();
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const [admins, setAdmins] = useState<ApiAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAdmin | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiAdmin | null>(null);

  // holat faqat promise callback'larida yangilanadi — effekt ichida
  // sinxron setState bo'lmasligi uchun. `loading` boshlang'ich holatda true,
  // qayta yuklashda esa uni chaqiruvchi handler o'zi yoqadi.
  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    return fetchAdmins(token)
      .then((r) => {
        if (r.kind === "unauthorized") {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        if (r.kind === "error") {
          setAdmins([]);
          setError(r.message);
          return;
        }
        setAdmins(r.rows);
        setError("");
      })
      .catch((e: unknown) => {
        console.error("Adminlarni yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (a: ApiAdmin) => {
    const token = localStorage.getItem("token");
    setDeletingId(a.id);
    try {
      const res = await fetch(`${API_ADMINS}/${a.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        setError(errorMessage(await readBody<ApiError>(res), "O'chirib bo'lmadi"));
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
    if (!q) return admins;
    return admins.filter((a) =>
      [a.full_name, a.phone, a.email, String(a.id)]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [admins, search]);

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

        /* ---------- Toolbar / pagination (seriy fon ustida) ---------- */
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
        /* faol sahifa va "Keyingi" — oq box */
        .pg.active, .pg.next { background:#fff; color:#0F172A; box-shadow:0 1px 2px rgba(16,24,40,.07); }
        .pg.next { padding:0 16px; }
        .pg:disabled { opacity:.5; cursor:not-allowed; }
        .pg:disabled:hover { background:#fff; }
        .pg.dots { color:#94A3B8; cursor:default; display:inline-flex; align-items:center; justify-content:center; }
        .pg.dots:hover { background:transparent; }

        /* ---------- Search ---------- */
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

        /* ---------- Jadval: oq karta, to'r chiziqlari bilan ---------- */
        .table-card { background:#fff; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; }
        .table-wrap { overflow-x:auto; }
        table.grid { width:100%; border-collapse:collapse; min-width:1000px; background:#fff; }
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
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Administratorlar</div>
          <div className="crumb">
            <span>Foydalanuvchilar</span>
            <i className="dot" />
            <span>Administratorlar</span>
          </div>
        </div>

        <button
          className="btn-add"
          onClick={() => {
            setEditing(null);
            setAddOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
            <path
              d="M12 8.5v7M8.5 12h7"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
          Qo&apos;shish
        </button>
      </div>

      <Toolbar {...toolbarProps} />

      <div className="search-row">
        <div className="search-box">
          <svg
            className="ic-l"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Izlash..."
          />
          <svg
            className="ic-r"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
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
                        <svg
                          className="funnel"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
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
                rows.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>
                      <div className="cell-user">
                        <div className="av">
                          <Image
                            src={avatarOf(a.file)}
                            alt=""
                            width={30}
                            height={30}
                            unoptimized
                          />
                        </div>
                        <span>{a.full_name}</span>
                      </div>
                    </td>
                    <td>{formatPhone(a.phone)}</td>
                    <td>{formatDate(a.create_at)}</td>
                    <td>{ROLE_LABEL[a.role] ?? a.role}</td>
                    <td>
                      <span
                        className={`badge ${a.status === "ACTIVE" ? "faol" : "nofaol"}`}
                      >
                        {a.status === "ACTIVE" ? "Faol" : "Nofaol"}
                      </span>
                    </td>
                    <td>
                      <div className="acts">
                        <button
                          className="act"
                          aria-label="Tahrirlash"
                          onClick={() => {
                            setEditing(a);
                            setAddOpen(true);
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
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
                          disabled={deletingId === a.id}
                          onClick={() => setPendingDelete(a)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
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

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.full_name}
          loading={deletingId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      )}

      {addOpen && (
        <AddAdminModal
          key={editing ? `edit-${editing.id}` : "create"}
          admin={editing}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setLoading(true);
            if (!editing) setPage(1);
            load();
          }}
          onUnauthorized={() => {
            setAddOpen(false);
            router.push("/login");
          }}
        />
      )}
    </DashboardShell>
  );
}
