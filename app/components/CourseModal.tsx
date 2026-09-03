"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  API_CATEGORIES,
  API_COURSES,
  API_MENTORS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

/* GET /api/v1/course/all qaytaradigan shakl (ro'yxat `message` ichida keladi) */
export type Course = {
  id: number;
  mentorId: number;
  assistantId: number | null;
  name: string;
  banner: string | null;
  intro_video: string | null;
  description: string;
  price: string;
  categoryId: number;
  status: string;
  level: string;
  create_at: string;
  update_at: string;
};

export const LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "ELEMENTERIY", label: "Elementary" },
  { value: "PREINTERMEDIA", label: "Pre-intermediate" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

/* profileId — mentorlar uchun: kurs yozuvidagi `mentorId` aynan mentor profili id'si,
   backend esa so'rovda mentorning user id'sini kutadi */
type Option = { id: number; name: string; profileId?: number };

type Props = {
  /* course berilsa — tahrirlash, bo'lmasa — qo'shish */
  course?: Course | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

const EMPTY_ERRORS = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  level: "",
  mentorId: "",
  banner: "",
  intro_video: "",
};
type Errors = typeof EMPTY_ERRORS;

/* "250000.00" -> "250 000" */
function groupDigits(raw: string) {
  const digits = String(raw ?? "").split(".")[0].replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* select'lar uchun ro'yxatlar: kategoriya va mentor.
   Ro'yxatlar faqat bir marta olinadi — callback ref orqali uzatiladi,
   aks holda har bosilgan harfda qayta so'rov ketardi. */
function useOptions(onUnauthorized: () => void) {
  const [categories, setCategories] = useState<Option[]>([]);
  const [mentors, setMentors] = useState<Option[]>([]);

  const unauthRef = useRef(onUnauthorized);
  useEffect(() => {
    unauthRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      unauthRef.current();
      return;
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    type RawOption = {
      id: number;
      name?: string;
      full_name?: string;
      mentorProfiles?: { id: number } | null;
    };
    type ListBody = { data?: RawOption[]; message?: RawOption[] };

    const pick = (b: ListBody | null) =>
      (Array.isArray(b?.data) ? b.data : Array.isArray(b?.message) ? b.message : []).map(
        (o) => ({
          id: o.id,
          name: o.name ?? o.full_name ?? String(o.id),
          profileId: o.mentorProfiles?.id,
        }),
      );

    fetch(`${API_CATEGORIES}/all`, auth)
      .then((r) => readBody<ListBody>(r))
      .then((b) => setCategories(pick(b)))
      .catch((e: unknown) => console.error("Kategoriyalarni yuklashda xato", e));

    fetch(`${API_MENTORS}/all`, auth)
      .then((r) => readBody<ListBody>(r))
      .then((b) => setMentors(pick(b)))
      .catch((e: unknown) => console.error("Mentorlarni yuklashda xato", e));
  }, []);

  return { categories, mentors };
}

export default function CourseModal({
  course = null,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const isEdit = !!course;
  const { categories, mentors } = useOptions(onUnauthorized);

  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [price, setPrice] = useState(course?.price ? groupDigits(course.price) : "");
  const [categoryId, setCategoryId] = useState(
    course?.categoryId ? String(course.categoryId) : "",
  );
  const [level, setLevel] = useState(course?.level ?? "");
  /* null — foydalanuvchi hali tanlamagan, tahrirlashda joriy mentor ko'rsatiladi */
  const [pickedMentor, setPickedMentor] = useState<string | null>(null);

  const [banner, setBanner] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [dragOver, setDragOver] = useState<"banner" | "video" | null>(null);

  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const bannerUrl = preview || (course?.banner ? `/uploads/images/${course.banner}` : "");
  const videoUrl =
    videoPreview || (course?.intro_video ? `/uploads/videos/${course.intro_video}` : "");

  /* tahrirlashda select joriy mentorni ko'rsatadi: kursdagi mentorId — profil id'si,
     select esa user id bilan ishlaydi */
  const mentorId = useMemo(() => {
    if (pickedMentor !== null) return pickedMentor;
    if (!course) return "";
    const found =
      mentors.find((m) => m.profileId === course.mentorId) ??
      mentors.find((m) => m.id === course.mentorId);
    return found ? String(found.id) : "";
  }, [pickedMentor, mentors, course]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const close = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    onClose();
  };

  const pickBanner = (f: File | null) => {
    if (f && !f.type.startsWith("image/")) {
      setErrors((p) => ({ ...p, banner: "Faqat rasm fayli (SVG, PNG, JPG, GIF)" }));
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setBanner(f);
    setPreview(f ? URL.createObjectURL(f) : "");
    setErrors((p) => ({ ...p, banner: "" }));
  };

  const pickVideo = (f: File | null) => {
    if (f && !f.type.startsWith("video/")) {
      setErrors((p) => ({ ...p, intro_video: "Faqat video fayl (.mp4)" }));
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(f);
    setVideoPreview(f ? URL.createObjectURL(f) : "");
    setErrors((p) => ({ ...p, intro_video: "" }));
  };

  const onDrop = (kind: "banner" | "video") => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (!f) return;
    if (kind === "banner") pickBanner(f);
    else pickVideo(f);
  };

  const validate = () => {
    const next = { ...EMPTY_ERRORS };

    if (name.trim().length < 3) next.name = "To'liq kiritilmadi";
    if (!description.trim()) next.description = "To'liq kiritilmadi";

    const p = Number(price.replace(/\s/g, ""));
    if (!price.trim() || Number.isNaN(p) || p < 0) next.price = "Narx noto'g'ri kiritildi";

    if (!categoryId) next.categoryId = "Kategoriya tanlanmadi";
    if (!level) next.level = "Daraja tanlanmadi";
    // backend PATCH'da ham mentorId talab qiladi
    if (!mentorId) next.mentorId = "Mentor tanlanmadi";

    if (!isEdit && !banner) next.banner = "Banner tanlanmadi";
    if (!isEdit && !video) next.intro_video = "Video tanlanmadi";

    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");
    if (!validate()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      onUnauthorized();
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("price", String(Number(price.replace(/\s/g, ""))));
      fd.append("categoryId", categoryId);
      fd.append("level", level);
      fd.append("mentorId", mentorId);
      if (banner) fd.append("banner", banner);
      if (video) fd.append("intro_video", video);

      const res = await fetch(isEdit ? `${API_COURSES}/${course!.id}` : API_COURSES, {
        method: isEdit ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const body = await readBody<ApiError>(res);

      if (!res.ok) {
        if (isAuthError(res, body)) {
          localStorage.removeItem("token");
          onUnauthorized();
          return;
        }
        setServerErr(errorMessage(body, "Saqlab bo'lmadi"));
        return;
      }

      setDone(true);
    } catch (err) {
      console.error("Kursni saqlashda xato", err);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const uploadIcon = (
    <div className="up-ico">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="M6.5 17.5a4 4 0 01-.4-8 5.5 5.5 0 0110.6-1.4 3.9 3.9 0 01.8 7.7"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 21v-8.5M9 14.5L12 11.5l3 3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  const styles = (
    <style>{`
      .ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:100;
            display:flex; align-items:center; justify-content:center; padding:24px; }
      .md { background:#fff; border-radius:14px; width:100%; max-width:640px; padding:22px 26px 26px;
            box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
      .md.sm { max-width:400px; padding:36px 28px 32px; }

      .md-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .md-title { font-size:21px; font-weight:700; color:#0F172A; }
      .md-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .md-x:hover { background:#F1F5F9; }
      .md-x svg { width:22px; height:22px; }

      .row2 { display:grid; grid-template-columns:1fr 1fr; gap:0 16px; }
      .fld { margin-bottom:16px; }
      .fld-label { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600;
                   color:#0F172A; margin-bottom:8px; }
      .fld-label .opt { font-weight:400; font-size:13px; color:#94A3B8; }

      .ipt-wrap { display:flex; align-items:center; border:1px solid #CBD5E1; border-radius:8px; background:#fff; }
      .ipt-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .ipt-wrap.err { border-color:#EF4444; }
      .ipt { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
             padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .ipt::placeholder { color:#94A3B8; }
      textarea.ipt { height:96px; padding:12px 14px; resize:vertical; line-height:1.5; }
      select.ipt { cursor:pointer; appearance:none; }
      .sfx { padding-right:14px; font-size:15px; color:#64748B; white-space:nowrap; }
      .caret { position:relative; }
      .caret::after { content:""; position:absolute; right:15px; top:50%; width:9px; height:9px;
                      border-right:1.7px solid #64748B; border-bottom:1.7px solid #64748B;
                      transform:translateY(-70%) rotate(45deg); pointer-events:none; }
      .fld-err { margin-top:7px; font-size:13.5px; color:#EF4444; }

      /* fayl yuklash maydonlari */
      .up-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .up { display:block; border:1px solid #E2E8F0; border-radius:12px; background:#fff;
            padding:18px 14px; text-align:center; cursor:pointer; }
      .up:hover, .up.drag { border-color:#93C5FD; background:#F8FBFF; }
      .up.err { border-color:#EF4444; }
      .up-ico { width:44px; height:44px; border-radius:50%; background:#F1F5F9; color:#475569;
                margin:0 auto 12px; display:flex; align-items:center; justify-content:center; }
      .up-ico svg { width:22px; height:22px; }
      .up-txt { font-size:14px; color:#475569; }
      .up-txt b { color:#3B82F6; font-weight:600; }
      .up-hint { margin-top:4px; font-size:12.5px; color:#94A3B8; }
      .up-prev { width:100%; height:104px; border-radius:10px; object-fit:cover; display:block;
                 margin-bottom:12px; background:#E2E8F0; }
      .up-file { margin-top:6px; font-size:12.5px; color:#475569; overflow:hidden;
                 text-overflow:ellipsis; white-space:nowrap; }

      .srv-err { margin:2px 0 14px; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                 border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .btn-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                  background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                  font-family:inherit; font-size:15px; font-weight:600; margin-top:6px; }
      .btn-save:hover:not(:disabled) { background:#2F73E0; }
      .btn-save:disabled { opacity:.65; cursor:not-allowed; }
      .btn-save svg { width:19px; height:19px; }
      .spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
              border-radius:50%; animation:spin .65s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }

      .ok { text-align:center; }
      .ok-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .ok-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .ok-dot svg { width:36px; height:36px; color:#fff; }
      .ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .btn-ok { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none; border-radius:8px;
                cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .btn-ok:hover { background:#2F73E0; }

      @media (max-width: 640px) {
        .row2, .up-grid { grid-template-columns:1fr; }
      }
    `}</style>
  );

  if (done) {
    return (
      <div
        className="ov"
        onClick={() => {
          onSaved();
          close();
        }}
      >
        {styles}
        <div className="md sm" onClick={(e) => e.stopPropagation()}>
          <div className="ok">
            <div className="ok-ring">
              <div className="ok-dot">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div className="ok-title">
              {isEdit ? "Muvaffaqiyatli o'zgartirildi" : "Muvaffaqiyatli qo'shildi"}
            </div>
            <button
              className="btn-ok"
              onClick={() => {
                onSaved();
                close();
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ov" onClick={close}>
      {styles}
      <div className="md" onClick={(e) => e.stopPropagation()}>
        <div className="md-head">
          <div className="md-title">{isEdit ? "Tahrirlash" : "Qo'shish"}</div>
          <button className="md-x" aria-label="Yopish" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="up-grid">
            <div className="fld">
              <div className="fld-label">Banner</div>
              <label
                className={`up${dragOver === "banner" ? " drag" : ""}${errors.banner ? " err" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver("banner");
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={onDrop("banner")}
              >
                {bannerUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="up-prev" src={bannerUrl} alt="" />
                )}
                {uploadIcon}
                <div className="up-txt">
                  <b>Bu yerga bosing</b> yoki faylni suring
                </div>
                <div className="up-hint">SVG, PNG, JPG or GIF (max. 800&times;400px)</div>
                {banner && <div className="up-file">{banner.name}</div>}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml"
                  hidden
                  onChange={(e) => pickBanner(e.target.files?.[0] ?? null)}
                />
              </label>
              {errors.banner && <p className="fld-err">{errors.banner}</p>}
            </div>

            <div className="fld">
              <div className="fld-label">Intro video</div>
              <label
                className={`up${dragOver === "video" ? " drag" : ""}${errors.intro_video ? " err" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver("video");
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={onDrop("video")}
              >
                {videoUrl && (
                  <video className="up-prev" src={videoUrl} muted preload="metadata" />
                )}
                {uploadIcon}
                <div className="up-txt">
                  <b>Bu yerga bosing</b> yoki faylni suring
                </div>
                <div className="up-hint">.mp4 fayl kengaytma mumkin (max. 5 Mb)</div>
                {video && <div className="up-file">{video.name}</div>}
                <input
                  type="file"
                  accept="video/mp4,video/*"
                  hidden
                  onChange={(e) => pickVideo(e.target.files?.[0] ?? null)}
                />
              </label>
              {errors.intro_video && <p className="fld-err">{errors.intro_video}</p>}
            </div>
          </div>

          <div className="fld">
            <div className="fld-label">Kurs nomi</div>
            <div className={`ipt-wrap${errors.name ? " err" : ""}`}>
              <input
                className="ipt"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="Kiriting"
              />
            </div>
            {errors.name && <p className="fld-err">{errors.name}</p>}
          </div>

          <div className="fld">
            <div className="fld-label">Kurs haqida</div>
            <div className={`ipt-wrap${errors.description ? " err" : ""}`}>
              <textarea
                className="ipt"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((p) => ({ ...p, description: "" }));
                }}
                placeholder="Kiriting"
              />
            </div>
            {errors.description && <p className="fld-err">{errors.description}</p>}
          </div>

          <div className="row2">
            <div className="fld">
              <div className="fld-label">Darajasi</div>
              <div className={`ipt-wrap caret${errors.level ? " err" : ""}`}>
                <select
                  className="ipt"
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setErrors((p) => ({ ...p, level: "" }));
                  }}
                >
                  <option value="">Tanlang</option>
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.level && <p className="fld-err">{errors.level}</p>}
            </div>

            <div className="fld">
              <div className="fld-label">Narxi</div>
              <div className={`ipt-wrap${errors.price ? " err" : ""}`}>
                <input
                  className="ipt"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => {
                    setPrice(groupDigits(e.target.value));
                    setErrors((p) => ({ ...p, price: "" }));
                  }}
                  placeholder="0.00 so'm"
                />
                {price && <span className="sfx">so&apos;m</span>}
              </div>
              {errors.price && <p className="fld-err">{errors.price}</p>}
            </div>
          </div>

          <div className="fld">
            <div className="fld-label">Kategoriya</div>
            <div className={`ipt-wrap caret${errors.categoryId ? " err" : ""}`}>
              <select
                className="ipt"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setErrors((p) => ({ ...p, categoryId: "" }));
                }}
              >
                <option value="">Tanlang</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.categoryId && <p className="fld-err">{errors.categoryId}</p>}
          </div>

          <div className="fld">
            <div className="fld-label">Mentor</div>
            <div className={`ipt-wrap caret${errors.mentorId ? " err" : ""}`}>
              <select
                className="ipt"
                value={mentorId}
                onChange={(e) => {
                  setPickedMentor(e.target.value);
                  setErrors((p) => ({ ...p, mentorId: "" }));
                }}
              >
                <option value="">Tanlang</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.mentorId && <p className="fld-err">{errors.mentorId}</p>}
          </div>

          {serverErr && <p className="srv-err">{serverErr}</p>}

          <button className="btn-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            Saqlash
          </button>
        </form>
      </div>
    </div>
  );
}
