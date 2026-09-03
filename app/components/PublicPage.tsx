"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* Landing va kurs sahifasi uchun umumiy qobiq: mavzu, header, footer va asosiy uslublar */

export const ADMIN_TELEGRAM = "Rikhsiboyev_77";

const LANGS = [
  { code: "uz", short: "O'z", label: "O'zbekcha" },
  { code: "ru", short: "Ру", label: "Русский" },
  { code: "en", short: "En", label: "English" },
];

type Theme = "light" | "dark";

/* Mavzu localStorage'da saqlanadi. useSyncExternalStore SSR bilan mos keladi
   va effekt ichida setState chaqirishga hojat qoldirmaydi. */
const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function readTheme(): Theme {
  const saved = localStorage.getItem("landing-theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function writeTheme(theme: Theme) {
  localStorage.setItem("landing-theme", theme);
  for (const callback of themeListeners) callback();
}

export function usePublicTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "light" as Theme,
  );
  return {
    dark: theme === "dark",
    toggleTheme: () => writeTheme(theme === "dark" ? "light" : "dark"),
  };
}

export type NavCourse = { id: number; name: string };

type Props = {
  /* "Kurslar" dropdowni uchun — bo'sh bo'lsa holat matni ko'rsatiladi */
  courses?: NavCourse[];
  coursesLoading?: boolean;
  children: React.ReactNode;
};

export default function PublicPage({
  courses = [],
  coursesLoading = false,
  children,
}: Props) {
  const { dark, toggleTheme } = usePublicTheme();
  const pathname = usePathname();

  const [coursesMenu, setCoursesMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const [lang, setLang] = useState(LANGS[0]);
  const [mobileMenu, setMobileMenu] = useState(false);

  const closeMenus = () => {
    setCoursesMenu(false);
    setLangMenu(false);
    setMobileMenu(false);
  };

  return (
    <div className={dark ? "landing dark" : "landing"}>
      <style>{BASE_STYLES}</style>

      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand" aria-label="IT Live">
            <Image
              src={dark ? "/logo2.svg" : "/logo.svg"}
              alt="IT Live"
              width={108}
              height={31}
              priority
            />
          </Link>

          <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
            <Link
              className={pathname === "/" ? "nav-link active" : "nav-link"}
              href="/"
              onClick={closeMenus}
            >
              Asosiy
            </Link>

            <div
              className="nav-drop"
              onMouseEnter={() => setCoursesMenu(true)}
              onMouseLeave={() => setCoursesMenu(false)}
            >
              <button
                type="button"
                className="nav-link"
                aria-expanded={coursesMenu}
                onClick={() => setCoursesMenu((o) => !o)}
              >
                Kurslar <IconChevron />
              </button>

              {coursesMenu && (
                <div className="drop-menu">
                  {coursesLoading && <span className="drop-empty">Yuklanmoqda…</span>}
                  {!coursesLoading && !courses.length && (
                    <span className="drop-empty">Kurslar topilmadi</span>
                  )}
                  {courses.slice(0, 6).map((c) => (
                    <Link
                      key={c.id}
                      href={`/course/${c.id}`}
                      className="drop-item"
                      onClick={closeMenus}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link className="nav-link" href="/#qoshiling" onClick={closeMenus}>
              Biz haqimizda
            </Link>
            <a
              className="nav-link"
              href={`https://t.me/${ADMIN_TELEGRAM}`}
              target="_blank"
              rel="noreferrer"
              onClick={closeMenus}
            >
              Bog&apos;lanish
            </a>

            {/* mobil menyuda kirish tugmasi (headerdagisi yashiriladi) */}
            <Link href="/login" className="btn btn-primary mobile-cta" onClick={closeMenus}>
              <IconUser /> Kirish / Ro&apos;yxatdan o&apos;tish
            </Link>
          </nav>

          <div className="nav-actions">
            <div className="lang" onMouseLeave={() => setLangMenu(false)}>
              <button
                type="button"
                className="lang-btn"
                aria-expanded={langMenu}
                onClick={() => setLangMenu((o) => !o)}
              >
                {lang.short} <IconChevron />
              </button>
              {langMenu && (
                <div className="drop-menu lang-menu">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={l.code === lang.code ? "drop-item active" : "drop-item"}
                      onClick={() => {
                        setLang(l);
                        setLangMenu(false);
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={dark ? "Yorug' rejim" : "Tungi rejim"}
            >
              {dark ? <IconSun /> : <IconMoon />}
            </button>

            <Link href="/login" className="btn btn-primary nav-cta">
              <IconUser /> Kirish / Ro&apos;yxatdan o&apos;tish
            </Link>

            <button
              type="button"
              className="icon-btn burger"
              onClick={() => setMobileMenu((o) => !o)}
              aria-label="Menyu"
              aria-expanded={mobileMenu}
            >
              <IconBurger open={mobileMenu} />
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

export function PublicFooter({ introVideo }: { introVideo?: string | null }) {
  const { dark } = usePublicTheme();
  const year = new Date().getFullYear();

  return (
    <footer className="foot">
      <div className="container foot-in">
        <Image
          src={dark ? "/logo2.svg" : "/logo.svg"}
          alt="IT Live"
          width={108}
          height={31}
        />
        <h2 className="foot-title">Biz bilan muvaffaqiyatga erishing</h2>
        <p className="foot-sub">Eng kuchlilar biz bilan qoladi!</p>

        <div className="foot-btns">
          {introVideo && (
            <a
              className="btn btn-ghost"
              href={`/uploads/videos/${introVideo}`}
              target="_blank"
              rel="noreferrer"
            >
              <IconPlay /> Intro video
            </a>
          )}
          <a
            className="btn btn-primary"
            href={`https://t.me/${ADMIN_TELEGRAM}`}
            target="_blank"
            rel="noreferrer"
          >
            Bog&apos;lanish
          </a>
        </div>

        <div className="foot-bar">
          <span>&copy; {year}. Barcha huquqlar himoyalangan</span>
          <span className="foot-links">
            <a href={`https://t.me/${ADMIN_TELEGRAM}`} target="_blank" rel="noreferrer">
              Terminlar
            </a>
            <a href={`https://t.me/${ADMIN_TELEGRAM}`} target="_blank" rel="noreferrer">
              Xavfsizlik
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- ikonkalar ---------- */

export function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 4.5 6 7.5 9 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.9 13.3c.8-2.4 2.8-3.8 5.1-3.8s4.3 1.4 5.1 3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M15 10.6A6.4 6.4 0 0 1 7.4 3a6.5 6.5 0 1 0 7.6 7.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M9 1.6v1.8M9 14.6v1.8M1.6 9h1.8M14.6 9h1.8M3.8 3.8l1.3 1.3M12.9 12.9l1.3 1.3M14.2 3.8l-1.3 1.3M5.1 12.9l-1.3 1.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBurger({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {open ? (
        <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" />
    </svg>
  );
}

/* ---------- umumiy uslublar ---------- */

const BASE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

html { scroll-behavior: smooth; }

.landing {
  --bg: #FFFFFF;
  --bg-soft: #F6F8FC;
  --surface: #FFFFFF;
  --text: #101828;
  --muted: #64748B;
  --border: #E6EAF2;
  --primary: #3D85F5;
  --primary-dark: #2872E0;
  --primary-soft: #EAF1FE;
  --hero-from: #E9F1FF;
  --hero-to: #FDF2E9;
  --shadow: 0 10px 30px rgba(16,24,40,.09);

  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

.landing.dark {
  --bg: #0E1420;
  --bg-soft: #131B29;
  --surface: #161F2E;
  --text: #EEF2F8;
  --muted: #94A3B8;
  --border: #253248;
  --primary-soft: rgba(61,133,245,.16);
  --hero-from: #121B2C;
  --hero-to: #1D1726;
  --shadow: 0 10px 30px rgba(0,0,0,.45);
}

.landing *, .landing *::before, .landing *::after { box-sizing: border-box; }
.landing h1, .landing h2, .landing h3 { line-height: 1.2; }
.landing p { line-height: 1.6; }

.container { width: min(1240px, 100% - 40px); margin-inline: auto; }
.center { display: flex; justify-content: center; margin-top: 34px; }
.center-text { text-align: center; }

/* ---- tugmalar ---- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: none; border-radius: 10px; padding: 12px 22px;
  font: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer; text-decoration: none; white-space: nowrap;
  transition: background .18s, box-shadow .18s, transform .12s;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); box-shadow: 0 8px 20px rgba(61,133,245,.32); }
.btn-primary:active { transform: scale(.98); }
.btn-lg { padding: 15px 30px; font-size: 15px; border-radius: 12px; }
.btn-white { background: #fff; color: var(--primary); }
.btn-white:hover { background: #EEF4FF; }
.btn-ghost { background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
.btn-dark { background: #0F172A; color: #fff; }
.btn-dark:hover { background: #1E293B; }

/* ---- header ---- */
.nav {
  position: sticky; top: 0; z-index: 50;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.nav-inner { position: relative; display: flex; align-items: center; gap: 30px; height: 74px; }
.brand { display: flex; align-items: center; }
.nav-links { display: flex; align-items: center; gap: 26px; margin-right: auto; }
.nav-link {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; padding: 6px 0;
  font: inherit; font-size: 15px; color: var(--text);
  text-decoration: none; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color .16s;
}
.nav-link:hover { color: var(--primary); }
.nav-link.active { font-weight: 600; border-bottom-color: var(--text); }
.nav-drop { position: relative; }

.drop-menu {
  position: absolute; top: calc(100% + 14px); left: -14px; z-index: 60;
  min-width: 192px; padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border); border-radius: 12px;
  box-shadow: var(--shadow);
  display: flex; flex-direction: column;
}
.drop-item {
  padding: 9px 12px; border-radius: 8px;
  background: none; border: none; text-align: left;
  font: inherit; font-size: 14px; color: var(--text);
  text-decoration: none; cursor: pointer;
}
.drop-item:hover { background: var(--bg-soft); color: var(--primary); }
.drop-item.active { color: var(--primary); font-weight: 600; }
.drop-empty { padding: 9px 12px; font-size: 13px; color: var(--muted); }

.nav-actions { display: flex; align-items: center; gap: 12px; }
.lang { position: relative; }
.lang-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: 22px;
  background: var(--bg-soft); border: 1px solid var(--border);
  font: inherit; font-size: 14px; color: var(--text); cursor: pointer;
}
.lang-btn:hover { border-color: var(--primary); }
.lang-menu { left: auto; right: 0; min-width: 150px; }

.icon-btn {
  width: 40px; height: 40px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg-soft); border: 1px solid var(--border);
  color: var(--text); cursor: pointer;
  transition: border-color .16s, color .16s;
}
.icon-btn:hover { border-color: var(--primary); color: var(--primary); }
.burger { display: none; }
.mobile-cta { display: none; }

/* ---- footer ---- */
.foot { background: var(--bg-soft); border-top: 1px solid var(--border); padding: 60px 0 26px; }
.foot-in { display: flex; flex-direction: column; align-items: center; text-align: center; }
.foot-title { font-size: 30px; font-weight: 800; letter-spacing: -.4px; margin: 26px 0 10px; }
.foot-sub { color: var(--muted); font-size: 15px; }
.foot-btns { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin: 26px 0 40px; }
.foot-bar {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px; padding-top: 22px;
  border-top: 1px solid var(--border);
  font-size: 13.5px; color: var(--muted);
}
.foot-links { display: flex; gap: 26px; }
.foot-links a { color: var(--muted); text-decoration: none; }
.foot-links a:hover { color: var(--primary); }

@media (max-width: 880px) {
  .burger { display: inline-flex; }
  .nav-links {
    display: none;
    position: absolute; top: 74px; left: 0; right: 0; z-index: 55;
    flex-direction: column; align-items: flex-start; gap: 4px;
    padding: 14px 4px 20px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow);
  }
  .nav-links.open { display: flex; }
  .nav-drop { width: 100%; }
  .drop-menu { position: static; box-shadow: none; border: none; padding: 0 0 0 12px; }
  .nav-cta { display: none; }
  .mobile-cta { display: inline-flex; margin-top: 8px; }
}

@media (max-width: 560px) {
  .foot-title { font-size: 23px; }
  .foot-bar { justify-content: center; text-align: center; }
}
`;
