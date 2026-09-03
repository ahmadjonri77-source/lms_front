"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "../components/DashboardShell";
import PaymentModal from "../components/PaymentModal";
import {
  API_COURSES,
  API_STUDENTS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

const COLUMNS = [
  { key: "no", label: "№" },
  { key: "buyer", label: "Sotib oluvchi", filter: true },
  { key: "course", label: "Kurs nomi", filter: true },
  { key: "category", label: "Yo'nalish", filter: true },
  { key: "price", label: "Summa" },
  { key: "date", label: "Sana" },
  { key: "status", label: "Holati" },
  { key: "confirm", label: "Tasdiqlash" },
  { key: "actions", label: "Amallar" },
];

/* Tahrirlash/o'chirish uchun assignedCourse endpointlari yo'q */
const NO_ENDPOINT = "Backendda bu amal uchun endpoint yo'q";

/* GET /course/all/buy -> {success, data:[{userId, coursesId, create_at, update_at}]} */
type Assigned = {
  userId: number;
  coursesId: number;
  create_at?: string;
  update_at?: string;
};

/* GET /course/all -> kurs `categories` bilan birga keladi */
type Course = {
  id: number;
  name: string;
  price: string | number;
  categoryId: number;
  categories?: { id: number; name: string } | null;
};

/* to'lov holati foydalanuvchi statusidan olinadi: ACTIVE -> tasdiqlangan */
type Buyer = {
  id: number;
  full_name: string;
  file: string | null;
  status?: string;
};

/* "1200000" -> "1 200 000" */
function formatPrice(price: string | number) {
  const num = Number(price);
  if (!Number.isFinite(num)) return String(price ?? "-");
  const [whole, fraction] = String(num).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fraction ? `${grouped},${fraction}` : grouped;
}

/* "2026-08-12T16:29:49.818Z" -> "12.08.2026 - 16:29:49" (UTC, hydration xavfsiz) */
function formatDate(iso?: string) {
  if (!iso) return "-";
  const [date, time = ""] = String(iso).split("T");
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y} - ${time.slice(0, 8)}`;
}

const AVATAR_COLORS = ["#DC2626", "#7C3AED", "#D97706", "#0891B2", "#DB2777", "#059669"];

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

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PaymentsPage() {
  const router = useRouter();
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<Assigned[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // sotib oluvchilar ro'yxati — xatosi jadvalni to'xtatmaydi
    fetch(API_STUDENTS, auth)
      .then((r) => readBody<{ data?: Buyer[] }>(r))
      .then((b) => setBuyers(Array.isArray(b?.data) ? b.data : []))
      .catch((e: unknown) => console.error("O'quvchilarni yuklashda xato", e));

    return Promise.all([
      fetch(`${API_COURSES}/all/buy`, auth).then(async (r) => ({
        res: r,
        body: await readBody<{ data?: Assigned[] } & ApiError>(r),
      })),
      fetch(`${API_COURSES}/all`, auth).then(async (r) => ({
        res: r,
        body: await readBody<{ message?: Course[]; data?: Course[] }>(r),
      })),
    ])
      .then(([buy, all]) => {
        if (isAuthError(buy.res, buy.body)) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (!buy.res.ok) {
          setRows([]);
          setError(errorMessage(buy.body, "To'lovlarni yuklab bo'lmadi"));
          return;
        }

        setRows(Array.isArray(buy.body?.data) ? buy.body.data : []);
        setCourses(
          Array.isArray(all.body?.message)
            ? all.body.message
            : Array.isArray(all.body?.data)
              ? all.body.data
              : [],
        );
        setError("");
      })
      .catch((e: unknown) => {
        console.error("To'lovlarni yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  /* "Tasdiqlash" foydalanuvchini faollashtiradi: PATCH /students/active/:id */
  const handleConfirm = async (userId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setConfirmingId(userId);
    try {
      const res = await fetch(`${API_STUDENTS}/active/${userId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await readBody<ApiError>(res);

      if (!res.ok) {
        if (isAuthError(res, body)) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(errorMessage(body, "Tasdiqlab bo'lmadi"));
        return;
      }

      setLoading(true);
      await load();
    } catch (e) {
      console.error("Tasdiqlashda xato", e);
      setError("Server bilan ulanishda xato yuz berdi");
    } finally {
      setConfirmingId(null);
    }
  };

  const courseOf = useCallback(
    (coursesId: number) => courses.find((c) => c.id === coursesId),
    [courses],
  );

  const buyerOf = useCallback(
    (userId: number) => buyers.find((b) => b.id === userId),
    [buyers],
  );

  /* qidiruv sotib oluvchi, kurs va yo'nalish bo'yicha ishlaydi */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const course = courseOf(r.coursesId);
      const buyer = buyerOf(r.userId);
      return [
        buyer?.full_name ?? "",
        course?.name ?? "",
        course?.categories?.name ?? "",
        String(r.userId),
        String(r.coursesId),
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, courseOf, buyerOf]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pageCount);
  const pageRows = filtered.slice((current - 1) * perPage, current * perPage);
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
        .crumb { display:flex; align-items:center; gap:10px; margin-top:8px; font-size:14px; color:#475569; }
        .crumb .dot { width:6px; height:6px; border-radius:50%; background:#94A3B8; }

        .btn-add { display:inline-flex; align-items:center; gap:9px; background:#DC2626; color:#fff; border:none;
                   border-radius:10px; padding:12px 22px; font-size:15px; font-weight:600; cursor:pointer; font-family:inherit;
                   box-shadow:0 2px 8px rgba(220,38,38,.3); white-space:nowrap; }
        .btn-add:hover { background:#B91C1C; }
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
        table.grid th .funnel { width:15px; height:15px; color:#94A3B8; margin-left:auto; flex-shrink:0; }
        table.grid td { padding:14px 18px; font-size:14px; color:#334155; white-space:nowrap;
                        border-bottom:1px solid #E2E8F0; border-right:1px solid #E2E8F0; }
        table.grid td:last-child { border-right:none; }
        table.grid tbody tr:last-child td { border-bottom:none; }
        table.grid th.no, table.grid td.no { width:64px; }
        td.state { text-align:center; color:#64748B; padding:34px 18px; border-right:none; }
        td.state.err { color:#B91C1C; }

        .buyer { display:flex; align-items:center; gap:12px; }
        .buyer-ava { width:34px; height:34px; border-radius:50%; object-fit:cover; flex:none; }
        .buyer-letter { width:34px; height:34px; border-radius:50%; flex:none; color:#fff;
                        display:flex; align-items:center; justify-content:center;
                        font-size:14px; font-weight:700; text-transform:uppercase; }
        .buyer-name { font-weight:500; color:#0F172A; }
        .sum { font-weight:700; color:#0F172A; }
        .muted { color:#94A3B8; }

        .badge { display:inline-flex; align-items:center; padding:5px 14px; border-radius:8px;
                 font-size:13px; font-weight:600; }
        .badge.ok { background:#DCFCE7; color:#15803D; }
        .badge.wait { background:#FEF3C7; color:#B45309; }

        .confirm { display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px;
                   border:1px solid #E2E8F0; border-radius:8px; background:#fff; color:#0F172A;
                   font-family:inherit; font-size:13.5px; font-weight:600; cursor:pointer; }
        .confirm:hover:not(:disabled) { background:#F8FAFC; }
        .confirm:disabled { opacity:.5; cursor:not-allowed; }
        .confirm.done { border-color:#BBF7D0; background:#F0FDF4; color:#15803D; cursor:default; }
        .confirm svg { width:15px; height:15px; }
        .confirm-spin { width:14px; height:14px; border:2px solid #CBD5E1; border-top-color:#3B82F6;
                        border-radius:50%; animation:cf-spin .65s linear infinite; }
        @keyframes cf-spin { to { transform:rotate(360deg); } }

        .acts { display:flex; align-items:center; gap:10px; }
        .act { width:32px; height:32px; border:1px solid #E2E8F0; border-radius:8px; background:#fff; cursor:pointer;
               display:inline-flex; align-items:center; justify-content:center; color:#64748B; }
        .act:hover:not(:disabled) { background:#F8FAFC; color:#0F172A; }
        .act.danger:hover:not(:disabled) { background:#FEF2F2; color:#DC2626; }
        .act:disabled { opacity:.45; cursor:not-allowed; }
        .act svg { width:16px; height:16px; }

        .note { margin-top:14px; font-size:13px; color:#94A3B8; line-height:1.6; }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">To&apos;lovlar</div>
          <div className="crumb">
            <span>Foydalanuvchilar</span>
            <i className="dot" />
            <span>To&apos;lovlar</span>
          </div>
        </div>

        <button className="btn-add" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" strokeWidth="1.9" strokeLinecap="round" />
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
            placeholder="Izlash..."
          />
          <svg className="ic-r" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 7h14M8 12h8M10.5 17h3" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <Pager {...pagerProps} />
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.key === "no" ? "no" : undefined}>
                    <div className="th-in">
                      {c.label}
                      {c.filter && (
                        <svg className="funnel" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 5h18l-7 8v6l-4 2v-8z" />
                        </svg>
                      )}
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

              {!loading && !error && pageRows.length === 0 && (
                <tr>
                  <td className="state" colSpan={COLUMNS.length}>
                    Ma&apos;lumot topilmadi
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                pageRows.map((r, i) => {
                  const course = courseOf(r.coursesId);
                  const buyer = buyerOf(r.userId);
                  const name = buyer?.full_name ?? `#${r.userId}`;
                  const active = buyer?.status === "ACTIVE";
                  const color = AVATAR_COLORS[r.userId % AVATAR_COLORS.length];

                  return (
                    <tr key={`${r.userId}-${r.coursesId}`}>
                      <td className="no">{from + i}</td>
                      <td>
                        <div className="buyer">
                          {buyer?.file ? (
                            <Image
                              className="buyer-ava"
                              src={`/uploads/images/${buyer.file}`}
                              alt=""
                              width={34}
                              height={34}
                              unoptimized
                            />
                          ) : (
                            <span
                              className="buyer-letter"
                              style={{ background: color }}
                              aria-hidden="true"
                            >
                              {name.charAt(0)}
                            </span>
                          )}
                          <span className="buyer-name">{name}</span>
                        </div>
                      </td>
                      <td>{course?.name ?? <span className="muted">#{r.coursesId}</span>}</td>
                      <td>
                        {course?.categories?.name ?? <span className="muted">-</span>}
                      </td>
                      <td className="sum">
                        {course ? formatPrice(course.price) : <span className="muted">-</span>}
                      </td>
                      <td>{formatDate(r.create_at)}</td>
                      <td>
                        {buyer ? (
                          <span className={active ? "badge ok" : "badge wait"}>
                            {active ? "Tasdiqlangan" : "Kutilmoqda"}
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        {active ? (
                          <span className="confirm done">
                            <IconCheck /> Tasdiqlangan
                          </span>
                        ) : (
                          <button
                            className="confirm"
                            disabled={!buyer || confirmingId === r.userId}
                            title={buyer ? undefined : "Foydalanuvchi ro'yxatda topilmadi"}
                            onClick={() => handleConfirm(r.userId)}
                          >
                            {confirmingId === r.userId ? (
                              <span className="confirm-spin" />
                            ) : (
                              <IconCheck />
                            )}
                            Tasdiqlash
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="acts">
                          <button
                            className="act"
                            aria-label="Tahrirlash"
                            disabled
                            title={NO_ENDPOINT}
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
                            className="act danger"
                            aria-label="O'chirish"
                            disabled
                            title={NO_ENDPOINT}
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
                  );
                })}
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

      {/* assignedCourse uchun tahrirlash/o'chirish endpointlari yo'q */}
      <p className="note">
        &laquo;Holati&raquo; foydalanuvchi statusidan olinadi:
        <code>INACTIVE</code> &rarr; Kutilmoqda, <code>ACTIVE</code> &rarr; Tasdiqlangan.
        &laquo;Tasdiqlash&raquo; foydalanuvchini faollashtiradi. &laquo;Amallar&raquo;
        hozircha faol emas: <code>assignedCourse</code> uchun tahrirlash va o&apos;chirish
        endpointlari yo&apos;q.
      </p>

      {modalOpen && (
        <PaymentModal
          buyers={buyers.map((b) => ({ id: b.id, name: b.full_name }))}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setLoading(true);
            setPage(1);
            load();
          }}
          onUnauthorized={() => {
            setModalOpen(false);
            router.push("/login");
          }}
        />
      )}
    </DashboardShell>
  );
}
