"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicPage, { ADMIN_TELEGRAM } from "./PublicPage";
import {
  Category,
  Course,
  LandingMentor,
  fetchCategories,
  fetchLandingCourses,
  fetchLandingMentors,
  formatPrice,
  imageUrl,
  levelLabel,
} from "../lib/landing";

const VISIBLE_STEP = 6;

type Filter =
  | { kind: "all" }
  | { kind: "category"; id: number }
  | { kind: "level"; value: string };

function sameFilter(a: Filter, b: Filter) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "category" && b.kind === "category") return a.id === b.id;
  if (a.kind === "level" && b.kind === "level") return a.value === b.value;
  return true;
}

export default function Landing() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [mentors, setMentors] = useState<LandingMentor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [visible, setVisible] = useState(VISIBLE_STEP);
  const [favorites, setFavorites] = useState<number[]>([]);

  /* landing ochiq endpoint'lardan o'qiydi: /course/all va /mentor/all/landing */
  useEffect(() => {
    const ac = new AbortController();

    Promise.all([
      fetchLandingCourses(ac.signal),
      fetchLandingMentors(ac.signal),
      fetchCategories(ac.signal),
    ])
      .then(([courseList, mentorList, categoryList]) => {
        if (ac.signal.aborted) return;
        setCourses(courseList);
        setMentors(mentorList);
        setCategories(categoryList);
        setError("");
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        console.error("Landing ma'lumotlarini yuklab bo'lmadi", err);
        setError(
          "Ma'lumotlarni yuklab bo'lmadi. Internet yoki server bilan aloqani tekshiring."
        );
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [reloadKey]);

  /* landingda faqat ACTIVE kurslar ko'rinadi */
  const activeCourses = useMemo(
    () => courses.filter((c) => c.status === "ACTIVE"),
    [courses]
  );

  const mentorById = useMemo(
    () => new Map(mentors.map((m) => [m.id, m])),
    [mentors]
  );

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const levels = useMemo(() => {
    const list: string[] = [];
    for (const c of activeCourses) if (!list.includes(c.level)) list.push(c.level);
    return list;
  }, [activeCourses]);

  const usedCategories = useMemo(
    () => categories.filter((cat) => activeCourses.some((c) => c.categoryId === cat.id)),
    [categories, activeCourses]
  );

  /* Kategoriya nomlari faqat token bo'lganda keladi (endpoint ADMIN uchun yopiq),
     shuning uchun mehmon foydalanuvchiga daraja bo'yicha filtr ko'rsatiladi */
  const filters = useMemo(() => {
    const list: { key: string; label: string; value: Filter }[] = [
      { key: "all", label: "Barcha kurslar", value: { kind: "all" } },
    ];

    if (usedCategories.length) {
      for (const cat of usedCategories) {
        list.push({
          key: `cat-${cat.id}`,
          label: cat.name,
          value: { kind: "category", id: cat.id },
        });
      }
    } else {
      for (const level of levels) {
        list.push({
          key: `lvl-${level}`,
          label: levelLabel(level),
          value: { kind: "level", value: level },
        });
      }
    }

    return list;
  }, [usedCategories, levels]);

  const filteredCourses = useMemo(() => {
    if (filter.kind === "all") return activeCourses;
    if (filter.kind === "category")
      return activeCourses.filter((c) => c.categoryId === filter.id);
    return activeCourses.filter((c) => c.level === filter.value);
  }, [activeCourses, filter]);

  const shownCourses = filteredCourses.slice(0, visible);

  const pickFilter = (value: Filter) => {
    setFilter(value);
    setVisible(VISIBLE_STEP);
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const navCourses = useMemo(
    () => activeCourses.map((c) => ({ id: c.id, name: c.name })),
    [activeCourses],
  );

  return (
    <PublicPage courses={navCourses} coursesLoading={loading}>
      <style>{STYLES}</style>

      {/* ---------- HERO ---------- */}
      <section className="hero" id="asosiy">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="accent-violet">Kelajak</span>{" "}
              <span className="accent-red">kasblarini</span> biz bilan
              o&apos;rganing!
            </h1>
            <p className="hero-sub">
              Tekinga o&apos;qib, pul ishlashga nima deysiz? Ishonmayapsizmi? Biz
              buni isbotlaymiz. Hammasi o&apos;zingizga bog&apos;liq.
            </p>
            <a href="#kurslar" className="btn btn-primary btn-lg">
              Kurslar bilan tanishish
            </a>
          </div>

          <div className="hero-art">
            <Image
              src="/landng_page.png"
              alt="Kompyuterda o'rganayotgan dasturchi"
              width={590}
              height={590}
              priority
            />
          </div>
        </div>
      </section>

      {/* ---------- KURSLAR ---------- */}
      <section className="section" id="kurslar">
        <div className="container">
          <h2 className="section-title center-text">Ommabop kurslar</h2>
          <p className="section-sub center-text">
            Kasbga yo&apos;naltirilgan praktikumlar yordamida eng tez va samarali
            yo&apos;llar bilan mutaxassislar qatoriga qo&apos;shiling. Har bir
            praktikum soha mutaxassislari tomonidan eng zamonaviy o&apos;quv reja
            asosida tayyorlangan
          </p>

          {filters.length > 1 && (
            <div className="chips">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={sameFilter(f.value, filter) ? "chip active" : "chip"}
                  onClick={() => pickFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="grid">
              {[0, 1, 2].map((i) => (
                <div className="card skeleton-card" key={i}>
                  <div className="sk sk-banner" />
                  <div className="card-body">
                    <div className="sk sk-line short" />
                    <div className="sk sk-line" />
                    <div className="sk sk-line" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="state">
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setReloadKey((k) => k + 1);
                }}
              >
                Qayta urinish
              </button>
            </div>
          )}

          {!loading && !error && !filteredCourses.length && (
            <div className="state">
              <p>Bu yo&apos;nalishda hozircha kurs yo&apos;q.</p>
            </div>
          )}

          {!loading && !error && !!filteredCourses.length && (
            <div className="grid">
              {shownCourses.map((course) => {
                const mentor = mentorById.get(course.mentorId);
                const categoryName = categoryById.get(course.categoryId);
                const liked = favorites.includes(course.id);

                return (
                  <article className="card" key={course.id}>
                    {/* butun karta bosiladigan bo'lsin, lekin ♡ tugmasi ustida qolsin */}
                    <Link
                      href={`/course/${course.id}`}
                      className="card-link"
                      aria-label={`${course.name} kursini ochish`}
                    />

                    <div className="card-banner">
                      <CourseBanner file={course.banner} alt={course.name} />
                      {categoryName && (
                        <span className="card-tag">{categoryName}</span>
                      )}
                    </div>

                    <div className="card-body">
                      <div className="card-top">
                        {mentor ? (
                          <span className="card-author">
                            <AvatarImage
                              className="card-avatar"
                              file={mentor.file}
                              alt=""
                              size={28}
                            />
                            {mentor.full_name}
                          </span>
                        ) : (
                          <span className="card-level">
                            {levelLabel(course.level)}
                          </span>
                        )}

                        <button
                          type="button"
                          className={liked ? "fav on" : "fav"}
                          aria-label="Sevimlilarga qo'shish"
                          aria-pressed={liked}
                          onClick={() => toggleFavorite(course.id)}
                        >
                          <IconHeart filled={liked} />
                        </button>
                      </div>

                      <h3 className="card-title">{course.name}</h3>
                      <p className="card-desc">{course.description}</p>

                      <div className="card-price">
                        <span>Kurs narxi:</span>
                        <strong>
                          {formatPrice(course.price)} <em>UZS</em>
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && !error && filteredCourses.length > visible && (
            <div className="center">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setVisible(filteredCourses.length)}
              >
                Barcha kurslarni ko&apos;rish
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ---------- MENTORLAR ---------- */}
      {!loading && !!mentors.length && (
        <section className="section section-alt" id="mentorlar">
          <div className="container">
            <h2 className="section-title center-text">Mentorlarimiz</h2>
            <p className="section-sub center-text">
              Amaliyotchi mentorlar bilan birga o&apos;rganing
            </p>

            <div className="mentors">
              {mentors.map((m) => (
                <div className="mentor" key={m.id}>
                  <AvatarImage
                    className="mentor-avatar"
                    file={m.file}
                    alt={m.full_name}
                    size={88}
                  />
                  <span className="mentor-name">{m.full_name}</span>
                  <span className="mentor-role">Mentor</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- BIZGA QO'SHILING ---------- */}
      <section className="section" id="qoshiling">
        <div className="container">
          <h2 className="section-title">Bizga qo&apos;shiling</h2>
          <p className="section-sub">
            Bizning safimizga nafaqat o&apos;rganuvchi, balki yetarlicha
            tajribangiz bo&apos;lsa mentor sifatida ham qo&apos;shilishingiz
            mumkin
          </p>

          <div className="join-grid">
            <div className="join-card">
              <h3>O&apos;quvchimisiz?</h3>
              <p>
                Agarda o&apos;quvchi bo&apos;lsangiz bizning xalqaro darajadagi
                tajribali mentorlarimizga shogird bo&apos;ling
              </p>
              <Link href="/register" className="btn btn-primary">
                Boshlash
              </Link>
            </div>

            <div className="join-card">
              <h3>Mentormisiz?</h3>
              <p>
                Bizning muallliflar jamoamizga qo&apos;shilib, o&apos;z
                tajribangizni boshqalar bilan oson va qulay platforma orqali
                ulashing
              </p>
              <a
                href={`https://t.me/${ADMIN_TELEGRAM}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Qo&apos;shilish
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta">
        <div className="container cta-inner">
          <h2>Istalgan nuqtadan onlayn o&apos;qish imkoniyati</h2>
          <p>Biz sizga bu imkoniyatni taqdim qilamiz</p>
          <Link href="/register" className="btn btn-white">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}

/* Ba'zi eski yozuvlarning fayli diskda yo'q (404) — shuning uchun zaxira ko'rinish */
function CourseBanner({ file, alt }: { file: string | null; alt: string }) {
  const [broken, setBroken] = useState(false);

  if (!file || broken) return <div className="card-banner-empty">IT Live</div>;

  return (
    <Image
      src={imageUrl(file)}
      alt={alt}
      width={420}
      height={230}
      unoptimized
      onError={() => setBroken(true)}
    />
  );
}

function AvatarImage({
  file,
  alt,
  size,
  className,
}: {
  file: string | null;
  alt: string;
  size: number;
  className: string;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <Image
      className={className}
      src={broken ? "/avatar.svg" : imageUrl(file)}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      onError={() => setBroken(true)}
    />
  );
}

/* ---------- ikonkalar ---------- */

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 16.5s-6.2-3.7-6.2-8A3.6 3.6 0 0 1 10 6.4a3.6 3.6 0 0 1 6.2 2.1c0 4.3-6.2 8-6.2 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

/* ---------- uslublar ---------- */

const STYLES = `
/* ---- hero ---- */
.hero {
  background: linear-gradient(115deg, var(--hero-from) 0%, var(--hero-from) 40%, var(--hero-to) 100%);
  padding: 60px 0 80px;
}
.hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
.hero-title { font-size: 52px; font-weight: 800; letter-spacing: -1px; margin-bottom: 22px; }
.accent-violet { color: #7C4DF0; }
.accent-red { color: #EF4444; }
.hero-sub { font-size: 16px; color: var(--muted); max-width: 470px; margin-bottom: 30px; }
.hero-art { display: flex; justify-content: center; }
.hero-art img { width: 100%; max-width: 560px; height: auto; }

/* ---- bo'limlar ---- */
.section { padding: 72px 0; }
.section-alt { background: var(--bg-soft); }
.section-title { font-size: 34px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 14px; }
.section-sub { font-size: 15px; color: var(--muted); margin-bottom: 28px; }
.center-text.section-sub { max-width: 830px; margin-inline: auto; margin-bottom: 32px; }

/* ---- filtr chiplari ---- */
.chips { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 34px; }
.chip {
  padding: 11px 22px; border-radius: 10px;
  border: 1px solid var(--primary); background: transparent;
  font: inherit; font-size: 14px; font-weight: 500; color: var(--primary);
  cursor: pointer; transition: background .16s, color .16s;
}
.chip:hover { background: var(--primary-soft); }
.chip.active { background: var(--primary); color: #fff; }

/* ---- kurs kartalari ---- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.card {
  position: relative;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  transition: transform .18s, box-shadow .18s;
}
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.card-link { position: absolute; inset: 0; z-index: 1; }
.card-banner { position: relative; height: 208px; background: var(--bg-soft); }
.card-banner img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-banner-empty {
  display: flex; align-items: center; justify-content: center; height: 100%;
  color: var(--muted); font-weight: 700; letter-spacing: 1px;
}
.card-tag {
  position: absolute; top: 14px; left: 14px;
  padding: 6px 13px; border-radius: 20px;
  background: var(--primary); color: #fff; font-size: 12px; font-weight: 600;
}
.card-body { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 16px 18px 20px; }
.card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-author { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 600; }
.card-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.card-level {
  padding: 5px 11px; border-radius: 20px;
  background: var(--primary-soft); color: var(--primary);
  font-size: 12px; font-weight: 600;
}
.fav { position: relative; z-index: 2; display: flex; padding: 2px; background: none; border: none;
       color: var(--muted); cursor: pointer; transition: color .16s; }
.fav:hover { color: #EF4444; }
.fav.on { color: #EF4444; }
.card-title { font-size: 17px; font-weight: 700; }
.card-desc { flex: 1; font-size: 13px; color: var(--muted); }
.card-price { display: flex; flex-direction: column; gap: 2px; padding-top: 12px; border-top: 1px solid var(--border); }
.card-price span { font-size: 12px; color: var(--muted); }
.card-price strong { font-size: 19px; font-weight: 800; }
.card-price em { font-style: normal; font-size: 12px; font-weight: 600; color: var(--muted); }

/* ---- skeleton / holatlar ---- */
.skeleton-card { pointer-events: none; }
.sk {
  border-radius: 8px;
  background: linear-gradient(90deg, var(--bg-soft) 25%, var(--border) 37%, var(--bg-soft) 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-banner { height: 208px; border-radius: 0; }
.sk-line { height: 12px; }
.sk-line.short { width: 45%; }
@keyframes sk-shimmer { from { background-position: 100% 50%; } to { background-position: 0 50%; } }

.state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 44px 0; color: var(--muted); text-align: center; }

/* ---- mentorlar ---- */
.mentors { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
.mentor {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 18px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
}
.mentor-avatar { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; background: var(--bg-soft); }
.mentor-name { font-size: 15px; font-weight: 700; text-align: center; }
.mentor-role { font-size: 12px; color: var(--muted); }

/* ---- bizga qo'shiling ---- */
.join-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.join-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 14px; padding: 28px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
}
.join-card h3 { font-size: 22px; font-weight: 700; }
.join-card p { flex: 1; font-size: 14px; color: var(--muted); }

/* ---- cta ---- */
.cta { position: relative; overflow: hidden; padding: 92px 0; background: var(--primary); color: #fff; }
.cta::before {
  content: ''; position: absolute; inset: 0;
  background-image: radial-gradient(rgba(255,255,255,.25) 1.6px, transparent 1.7px);
  background-size: 16px 16px;
  opacity: .55;
}
.cta-inner { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.cta h2 { font-size: 38px; font-weight: 800; letter-spacing: -.6px; }
.cta p { font-size: 15px; opacity: .92; margin-bottom: 12px; }

/* ---- responsive ---- */
@media (max-width: 1024px) {
  .hero { padding: 44px 0 60px; }
  .hero-inner { grid-template-columns: 1fr; }
  .hero-title { font-size: 40px; }
  .hero-art { max-width: 480px; margin-inline: auto; }
  .join-grid { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .hero-title { font-size: 32px; }
  .section { padding: 52px 0; }
  .section-title { font-size: 26px; }
  .cta { padding: 64px 0; }
  .cta h2 { font-size: 26px; }
  .grid { grid-template-columns: 1fr; }
}
`;
