"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { decodeToken } from "../lib/auth";

type MenuChild = { label: string; href: string };
type MenuItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: MenuChild[];
};

const IconGrid = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="1.6" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="1.6" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="1.6" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="1.6" />
  </svg>
);

const IconUsers = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="9" cy="8" r="3.2" strokeWidth="1.6" />
    <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" strokeWidth="1.6" />
    <path
      d="M16.5 5.2a3.2 3.2 0 010 5.9M18 14.8c2.1.6 3.5 2.2 3.5 4.4"
      strokeWidth="1.6"
    />
  </svg>
);

const IconFolder = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="4" width="18" height="16" rx="2.5" strokeWidth="1.6" />
    <path d="M8 4v16" strokeWidth="1.6" />
  </svg>
);

const IconCard = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" strokeWidth="1.6" />
    <path d="M2.5 10h19" strokeWidth="1.6" />
  </svg>
);

const IconChat = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M21 14.5a2.5 2.5 0 01-2.5 2.5H8l-5 4V5.5A2.5 2.5 0 015.5 3h13A2.5 2.5 0 0121 5.5z"
      strokeWidth="1.6"
    />
  </svg>
);

// API ulanmagunicha statik — keyin backend'dan keladi
const USER = { name: "SuperAdmin", role: "Administrator" };

const MENU: MenuItem[] = [
  { label: "Asosiy", href: "/dashboard", icon: IconGrid },
  {
    label: "Foydalanuvchilar",
    icon: IconUsers,
    children: [
      { label: "Administratorlar", href: "/administrators" },
      { label: "Mentorlar", href: "/mentors" },
      { label: "Assistentlar", href: "/assistants" },
      { label: "O'quvchilar", href: "/students" },
    ],
  },
  {
    label: "Materiallar",
    icon: IconFolder,
    children: [
      { label: "Kurs kategoriyalari", href: "/course-categories" },
      { label: "Kurslar", href: "/courses" },
      { label: "Bo'limlar", href: "/sections" },
      { label: "Darslar", href: "/lessons" },
    ],
  },
  { label: "To'lovlar", href: "/payments", icon: IconCard },
  { label: "Izohlar", href: "/comments", icon: IconChat },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<string[]>(() =>
    MENU.filter((m) =>
      m.children?.some((c) => pathname.startsWith(c.href)),
    ).map((m) => m.label),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const profRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // talaba admin panelga kira olmaydi — o'z sahifasiga qaytariladi
    if (decodeToken(token)?.role === "STUDENT") router.push("/student");
  }, [router]);

  // tashqariga bosilganda profil menyusi yopiladi
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!profRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  const toggle = (label: string) =>
    setOpen((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );

  const isActive = (href?: string) => !!href && pathname === href;

  return (
    <div className={`shell${collapsed ? " collapsed" : ""}`}>
      <style>{`
        .shell { font-family: 'Inter','Segoe UI',Arial,sans-serif; min-height:100vh; display:flex; background:#F1F5F9; }

        /* ---------- Sidebar ---------- */
        .sb { width:260px; background:#0B1121; color:#fff; padding:20px 16px; box-sizing:border-box;
              position:fixed; left:0; top:0; bottom:0; overflow-y:auto; transition:width .18s ease; z-index:30; }
        .shell.collapsed .sb { width:78px; padding:20px 12px; }
        .sb-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:22px; }
        .sb-toggle { background:transparent; border:none; color:#94A3B8; cursor:pointer; display:inline-flex; padding:4px; border-radius:6px; }
        .sb-toggle:hover { background:rgba(255,255,255,.08); color:#fff; }
        .sb-toggle svg { width:20px; height:20px; }

        .sb-pill { background:#16203A; border-radius:10px; padding:12px 14px; color:#fff; font-weight:700;
                   text-transform:uppercase; letter-spacing:.5px; font-size:11px; margin-bottom:16px; }
        .sb-menu { list-style:none; margin:0; padding:0; }

        .sb-item { display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:8px;
                   font-size:14px; color:#E2E8F0; cursor:pointer; user-select:none; }
        .sb-item:hover { background:rgba(255,255,255,.06); }
        .sb-item.active { background:#1E293B; color:#fff; font-weight:600; }
        .sb-item.open { color:#fff; font-weight:600; }
        .sb-item svg { width:19px; height:19px; flex-shrink:0; }
        .sb-label { flex:1; white-space:nowrap; overflow:hidden; }
        .sb-caret { width:14px; height:14px; flex-shrink:0; transition:transform .18s ease; color:#94A3B8; }
        .sb-caret.up { transform:rotate(180deg); }
        .shell.collapsed .sb-label, .shell.collapsed .sb-caret,
        .shell.collapsed .sb-pill, .shell.collapsed .sb-sub { display:none; }
        .shell.collapsed .sb-item { justify-content:center; padding:11px 0; }

        .sb-sub { list-style:none; margin:2px 0 6px 0; padding:0 0 0 30px; }
        .sb-sub li { padding:9px 12px; margin-top:2px; border-radius:8px; font-size:13px; color:#CBD5E1; cursor:pointer; white-space:nowrap; }
        .sb-sub li:hover { background:rgba(255,255,255,.06); color:#fff; }
        .sb-sub li.active { background:#1E293B; color:#fff; font-weight:600; }

        /* ---------- Main ---------- */
        .main { margin-left:260px; flex:1; display:flex; flex-direction:column; min-width:0; transition:margin-left .18s ease; }
        .shell.collapsed .main { margin-left:78px; }

        .topbar { height:74px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between;
                  padding:0 28px; background:#F1F5F9; }
        .tb-left { display:flex; align-items:center; gap:9px; font-weight:600; font-size:15px; color:#0F172A; }
        .tb-left svg, .tb-left img { width:22px; height:22px; color:#0F172A; }
        .tb-right { display:flex; align-items:center; gap:12px; }

        .ic-btn { width:40px; height:40px; background:#fff; border:1px solid #EEF1F5; border-radius:10px; cursor:pointer;
                  display:inline-flex; align-items:center; justify-content:center; position:relative;
                  box-shadow:0 1px 3px rgba(16,24,40,.06); }
        .ic-btn svg { width:19px; height:19px; color:#0F172A; }
        .ic-badge { position:absolute; top:-5px; right:-5px; min-width:18px; height:18px; padding:0 5px; background:#EF4444;
                    color:#fff; font-size:11px; font-weight:700; border-radius:999px; display:flex; align-items:center; justify-content:center; }

        .lang { height:40px; background:#fff; border:1px solid #EEF1F5; border-radius:10px; padding:0 12px; font-size:14px;
                color:#0F172A; display:inline-flex; align-items:center; gap:26px; cursor:pointer; box-shadow:0 1px 3px rgba(16,24,40,.06); }
        .lang svg { width:16px; height:16px; color:#64748B; }

        /* ---------- Profil ---------- */
        /* Pill o'lchami ochiq/yopiq holatda o'zgarmaydi — menyu shunchaki tagidan tushadi.
           Slot qat'iy, karta absolute — topbar'dagi boshqa elementlar siljimaydi. */
        .prof-wrap { position:relative; width:214px; height:44px; flex-shrink:0; }
        .prof-panel { position:absolute; top:0; right:0; width:100%; background:#fff; border:1px solid #EEF1F5;
                      border-radius:10px; box-shadow:0 1px 3px rgba(16,24,40,.06); z-index:40; }
        .prof-wrap.open .prof-panel { box-shadow:0 12px 32px rgba(16,24,40,.16); z-index:60; }

        .prof { height:42px; padding:0 12px; display:flex; align-items:center; gap:10px; cursor:pointer; }

        .prof-av { width:30px; height:30px; border-radius:50%; background:#C43A76; color:#fff; flex-shrink:0;
                   display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }

        .prof-text { flex:1; min-width:0; }
        .prof-name { font-size:13px; font-weight:700; color:#0F172A; line-height:1.3;
                     white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .prof-role { font-size:11px; color:#94A3B8; line-height:1.35; }

        .prof-chev { width:16px; height:16px; color:#64748B; flex-shrink:0; transition:transform .18s ease; }
        .prof-wrap.open .prof-chev { transform:rotate(180deg); }

        .prof-menu { padding:4px; border-top:1px solid #F1F5F9; }
        .prof-menu button { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px;
                            background:transparent; border:none; padding:11px 10px; border-radius:8px;
                            font-family:inherit; font-size:14px; color:#1F2937; cursor:pointer; text-align:left;
                            white-space:nowrap; }
        .prof-menu button:hover { background:#F3F4F6; }
        .prof-menu button svg { width:18px; height:18px; color:#1F2937; flex-shrink:0; }

        .content { padding:8px 28px 40px; flex:1; background:#F1F5F9; }

        @media (max-width:900px) {
          .sb { transform:translateX(-100%); }
          .main, .shell.collapsed .main { margin-left:0; }
          .prof-text { display:none; }
        }
      `}</style>

      <aside className="sb">
        <div className="sb-top">
          {!collapsed && (
            <Image
              src="/logo2.svg"
              alt="iTLive"
              width={104}
              height={30}
              priority
            />
          )}
          <button
            className="sb-toggle"
            aria-label="Menyuni yig'ish"
            onClick={() => setCollapsed((c) => !c)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2.5"
                strokeWidth="1.6"
              />
              <path d="M9 4v16" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        <div className="sb-pill">Boshqaruv paneli</div>

        <ul className="sb-menu">
          {MENU.map((item) => {
            const expanded = open.includes(item.label);
            const childActive = item.children?.some((c) => isActive(c.href));
            return (
              <li key={item.label}>
                <div
                  className={`sb-item${isActive(item.href) ? " active" : ""}${
                    childActive ? " open" : ""
                  }`}
                  onClick={() =>
                    item.children ? toggle(item.label) : router.push(item.href!)
                  }
                >
                  {item.icon}
                  <span className="sb-label">{item.label}</span>
                  {item.children && (
                    <svg
                      className={`sb-caret${expanded ? " up" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>

                {item.children && expanded && (
                  <ul className="sb-sub">
                    {item.children.map((c) => (
                      <li
                        key={c.href}
                        className={isActive(c.href) ? "active" : ""}
                        onClick={() => router.push(c.href)}
                      >
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="tb-left">
            <img src="/Icon.svg" alt="" />
            Admin
          </div>

          <div className="tb-right">
            <button className="ic-btn" aria-label="Bildirishnomalar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M18 8.5a6 6 0 10-12 0c0 4.5-1.8 6-1.8 6h15.6S18 13 18 8.5z"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.7 18.5a2 2 0 01-3.4 0"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span className="ic-badge">2</span>
            </button>

            <button className="ic-btn" aria-label="Sozlamalar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
                <path
                  d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"
                  strokeWidth="1.4"
                />
              </svg>
            </button>

            <div className="lang">
              O&apos;zbek tili
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <div
              ref={profRef}
              className={`prof-wrap${profileOpen ? " open" : ""}`}
            >
              <div className="prof-panel">
                <div className="prof" onClick={() => setProfileOpen((o) => !o)}>
                  <div className="prof-av">{USER.name.charAt(0)}</div>
                  <div className="prof-text">
                    <div className="prof-name">{USER.name}</div>
                    <div className="prof-role">{USER.role}</div>
                  </div>
                  <svg
                    className="prof-chev"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {profileOpen && (
                  <div className="prof-menu">
                    <button onClick={() => router.push("/")}>
                      Saytga qaytish
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M9 6L4 11l5 5"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4 11h10a5.5 5.5 0 015.5 5.5V18"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    <button onClick={() => router.push("/profile")}>
                      Profil ma&apos;lumotlari
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle cx="12" cy="8" r="3.6" strokeWidth="2" />
                        <path
                          d="M5 20c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => {
                        localStorage.removeItem("token");
                        router.push("/login");
                      }}
                    >
                      Profildan chiqish
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M14 4h-7a1 1 0 00-1 1v14a1 1 0 001 1h7"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M17 8l4 4-4 4M11 12h10"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
