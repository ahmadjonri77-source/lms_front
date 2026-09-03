"use client";

import { useEffect, useState } from "react";
import {
  API_MENTORS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

export type MentorProfile = {
  id?: number;
  experience?: number | null;
  job?: string | null;
  web_link?: string | null;
  description?: string | null;
  facebook?: string | null;
  telegram?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  github?: string | null;
};

export type Mentor = {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  password: string;
  file: string | null;
  role: string;
  status: string;
  create_at: string;
  update_at: string;
  mentorProfiles: MentorProfile | null;
};

type Props = {
  /* mentor berilsa — tahrirlash, bo'lmasa — qo'shish.
     Parent modalni faqat ochilganda mount qiladi, shuning uchun boshlang'ich
     qiymatlarni useState ichida bir marta o'qish yetarli */
  mentor: Mentor | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

const EMPTY_ERRORS = { full_name: "", phone: "", email: "", password: "" };
type Errors = typeof EMPTY_ERRORS;

const IcFacebook = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M14.5 8.5h2.2V5.6h-2.4c-2 0-3.3 1.3-3.3 3.4v1.6H8.8v3h2.2V21h3.1v-7.4h2.3l.4-3h-2.7v-1.3c0-.5.2-.8.4-.8z"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

const IcTelegram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M21.5 3.9L2.9 10.9c-.8.3-.8 1.5 0 1.8l4.6 1.6 1.7 5.1c.3.8 1.3 1 1.8.3l2.4-3 4.6 3.4c.6.4 1.4.1 1.6-.6l3.1-14.1c.2-.7-.5-1.3-1.2-1z"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M7.5 14.3L18.4 6.5l-8.5 9.4" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const IcLinkedin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3" strokeWidth="1.5" />
    <path d="M7.4 10.4v6.2M7.4 7.6v.1" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="M11.4 16.6v-6.2M11.4 12.6c0-1.2.9-2.2 2.2-2.2s2.2 1 2.2 2.2v4"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IcInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3.8" strokeWidth="1.5" />
    <circle cx="17" cy="7" r=".9" fill="currentColor" stroke="none" />
  </svg>
);

const IcGithub = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M9.3 20.4c-4.2 1.2-4.2-2.2-5.9-2.6m11.8 5v-3.3c0-.9.1-1.3-.4-1.8 2.4-.3 4.7-1.2 4.7-5.2a4 4 0 00-1.1-2.8c.2-.6.2-1.5-.1-2.4 0 0-.9-.3-2.9 1.1a10 10 0 00-5.2 0C8.2 7 7.3 7.3 7.3 7.3c-.3.9-.3 1.8-.1 2.4a4 4 0 00-1.1 2.8c0 4 2.3 4.9 4.7 5.2-.4.4-.4.9-.4 1.6v3.5"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ijtimoiy tarmoq maydonlari — o'ng ustun */
const SOCIALS = [
  { key: "facebook", label: "Facebook", placeholder: "Facebook.com", Icon: IcFacebook },
  { key: "telegram", label: "Telegram", placeholder: "Telegram.me", Icon: IcTelegram },
  { key: "linkedin", label: "LinkedIn", placeholder: "LinkedIn", Icon: IcLinkedin },
  { key: "instagram", label: "Instagram", placeholder: "Instagram.com", Icon: IcInstagram },
  { key: "github", label: "GitHub", placeholder: "GitHub.com", Icon: IcGithub },
] as const;

type SocialKey = (typeof SOCIALS)[number]["key"];
type Socials = Record<SocialKey, string>;

export default function MentorModal({
  mentor,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const isEdit = !!mentor;
  const p = mentor?.mentorProfiles;
  const currentImage = mentor?.file ? `/uploads/images/${mentor.file}` : "";

  const [fullName, setFullName] = useState(mentor?.full_name ?? "");
  const [phone, setPhone] = useState(mentor?.phone ?? "+998");
  const [email, setEmail] = useState(mentor?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [experience, setExperience] = useState(
    p?.experience != null ? String(p.experience) : "",
  );
  const [job, setJob] = useState(p?.job ?? "");
  const [webLink, setWebLink] = useState(p?.web_link ?? "");
  const [description, setDescription] = useState(p?.description ?? "");
  const [socials, setSocials] = useState<Socials>({
    facebook: p?.facebook ?? "",
    telegram: p?.telegram ?? "",
    linkedin: p?.linkedin ?? "",
    instagram: p?.instagram ?? "",
    github: p?.github ?? "",
  });

  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const validate = () => {
    const next = { ...EMPTY_ERRORS };

    const name = fullName.trim();
    if (name.length < 3 || name.length > 30) next.full_name = "3-30 ta belgi bo'lsin";

    if (phone.replace(/\D/g, "").length !== 12) next.phone = "To'liq kiritilmadi";

    // qo'shishda email majburiy (backend IsEmail), tahrirlashda — faqat to'ldirilsa
    const mail = email.trim();
    if (!isEdit || mail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
        next.email = "Email noto'g'ri kiritildi";
    }

    // tahrirlashda parol ixtiyoriy: bo'sh qolsa eskisi saqlanadi
    if (!isEdit && password.length < 3) next.password = "Kamida 3 ta belgi";
    if (isEdit && password && password.length < 3) next.password = "Kamida 3 ta belgi";

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

    // Content-Type qo'yilmaydi — brauzer multipart boundary'ni o'zi qo'shadi
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("phone", phone.trim());
    if (email.trim()) fd.append("email", email.trim());
    if (password) fd.append("password", password);
    if (experience.trim()) fd.append("experience", experience.trim());
    if (job.trim()) fd.append("job", job.trim());
    if (webLink.trim()) fd.append("web_link", webLink.trim());
    if (description.trim()) fd.append("description", description.trim());
    SOCIALS.forEach(({ key }) => {
      const v = socials[key].trim();
      if (v) fd.append(key, v);
    });
    if (file) fd.append("file", file);

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `${API_MENTORS}/${mentor!.id}` : API_MENTORS,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );

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
      console.error("Mentorni saqlashda xato", err);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:100;
            display:flex; align-items:center; justify-content:center; padding:24px; }
      .md { background:#fff; border-radius:16px; width:100%; max-width:860px; padding:26px 30px 30px;
            box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
      .md.sm { max-width:390px; padding:34px 28px 30px; text-align:center; }

      .md-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .md-title { font-size:22px; font-weight:700; color:#0F172A; }
      .md-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .md-x:hover { background:#F1F5F9; }
      .md-x svg { width:22px; height:22px; }

      .fld { margin-bottom:14px; }
      .fld-label { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600;
                   color:#0F172A; margin-bottom:7px; }
      .fld-label .opt { font-weight:400; font-size:13px; color:#94A3B8; }

      .ipt-wrap { display:flex; align-items:center; border:1px solid #E2E8F0; border-radius:9px; background:#fff; }
      .ipt-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .ipt-wrap.err { border-color:#EF4444; }
      .ipt-wrap.err:focus-within { box-shadow:0 0 0 3px rgba(239,68,68,.12); }
      .ipt { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
             padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .ipt::placeholder { color:#94A3B8; }
      .ipt-ic { padding:0 14px; display:inline-flex; align-items:center; color:#334155; }
      .ipt-ic svg { width:19px; height:19px; }
      .eye-b { background:transparent; border:none; padding:0 14px; cursor:pointer; color:#64748B; display:inline-flex; }
      .eye-b:hover { color:#0F172A; }
      .eye-b svg { width:19px; height:19px; }
      .txt { width:100%; min-height:150px; resize:vertical; border:1px solid #E2E8F0; border-radius:9px;
             padding:12px 14px; font-family:inherit; font-size:15px; color:#0F172A; outline:none; }
      .txt::placeholder { color:#94A3B8; }
      .txt:focus { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .fld-err { margin-top:6px; font-size:13.5px; color:#EF4444; }

      /* ikki ustunli qism */
      .cols { display:grid; grid-template-columns:1fr 1fr; gap:0 34px; margin-top:24px; }
      .col-title { font-size:16px; font-weight:700; color:#0F172A; padding-bottom:12px;
                   border-bottom:1px solid #E2E8F0; margin-bottom:16px; }

      .file-row { display:flex; align-items:center; gap:14px; }
      .file-btn { display:inline-flex; align-items:center; gap:9px; height:46px; padding:0 18px;
                  border:1px dashed #CBD5E1; border-radius:9px; background:#F8FAFC; cursor:pointer;
                  font-family:inherit; font-size:14px; font-weight:500; color:#334155; white-space:nowrap; }
      .file-btn:hover { border-color:#93C5FD; background:#F1F7FF; color:#0F172A; }
      .file-btn svg { width:18px; height:18px; }
      .file-prev { width:46px; height:46px; border-radius:9px; object-fit:cover; border:1px solid #E2E8F0; flex-shrink:0; }
      .file-name { font-size:13px; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .file-clear { background:transparent; border:none; padding:4px; cursor:pointer; color:#94A3B8;
                    display:inline-flex; border-radius:6px; flex-shrink:0; }
      .file-clear:hover { color:#B91C1C; background:#FEF2F2; }
      .file-clear svg { width:17px; height:17px; }

      .srv-err { margin:14px 0 0; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                 border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .btn-save { display:inline-flex; align-items:center; gap:10px; height:50px; padding:0 30px;
                  background:#3B82F6; color:#fff; border:none; border-radius:9px; cursor:pointer;
                  font-family:inherit; font-size:16px; font-weight:600; margin-top:20px; }
      .btn-save:hover:not(:disabled) { background:#2F73E0; }
      .btn-save:disabled { opacity:.65; cursor:not-allowed; }
      .btn-save svg { width:20px; height:20px; }
      .spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
              border-radius:50%; animation:spin .65s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }

      .ok-ring { width:96px; height:96px; border-radius:50%; background:#DCFCE7; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .ok-dot { width:66px; height:66px; border-radius:50%; background:#22C55E;
                display:flex; align-items:center; justify-content:center; }
      .ok-dot svg { width:34px; height:34px; color:#fff; }
      .ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .btn-ok { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none; border-radius:8px;
                cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .btn-ok:hover { background:#2F73E0; }

      @media (max-width: 760px) { .cols { grid-template-columns:1fr; gap:0; } }
    `}</style>
  );

  const finish = () => {
    onSaved();
    onClose();
  };

  if (done) {
    return (
      <div className="ov" onClick={finish}>
        {styles}
        <div className="md sm" onClick={(e) => e.stopPropagation()}>
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
            {isEdit ? "Muvaffaqiyatli saqlandi" : "Muvaffaqiyatli qo'shildi"}
          </div>
          <button className="btn-ok" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ov" onClick={onClose}>
      {styles}
      <div className="md" onClick={(e) => e.stopPropagation()}>
        <div className="md-head">
          <div className="md-title">{isEdit ? "Tahrirlash" : "Qo'shish"}</div>
          <button className="md-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* F.I.Sh */}
          <div className="fld">
            <div className="fld-label">F.I.Sh</div>
            <div className={`ipt-wrap${errors.full_name ? " err" : ""}`}>
              <input
                className="ipt"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((s) => ({ ...s, full_name: "" }));
                }}
                placeholder="Kiriting"
                autoFocus
              />
            </div>
            {errors.full_name && <p className="fld-err">{errors.full_name}</p>}
          </div>

          {/* Telefon */}
          <div className="fld">
            <div className="fld-label">Telefon raqami</div>
            <div className={`ipt-wrap${errors.phone ? " err" : ""}`}>
              <input
                className="ipt"
                type="tel"
                value={phone}
                maxLength={13}
                onChange={(e) => {
                  const v = e.target.value;
                  const digits = v.startsWith("+998")
                    ? v.slice(4).replace(/\D/g, "").slice(0, 9)
                    : "";
                  setPhone("+998" + digits);
                  setErrors((s) => ({ ...s, phone: "" }));
                }}
                placeholder="+998"
              />
            </div>
            {errors.phone && <p className="fld-err">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div className="fld">
            <div className="fld-label">Email</div>
            <div className={`ipt-wrap${errors.email ? " err" : ""}`}>
              <input
                className="ipt"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((s) => ({ ...s, email: "" }));
                }}
                placeholder="example@mail.com"
              />
            </div>
            {errors.email && <p className="fld-err">{errors.email}</p>}
          </div>

          {/* Parol */}
          <div className="fld">
            <div className="fld-label">
              Parol
              {isEdit && <span className="opt">(o&apos;zgartirmasangiz bo&apos;sh qoldiring)</span>}
            </div>
            <div className={`ipt-wrap${errors.password ? " err" : ""}`}>
              <input
                className="ipt"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((s) => ({ ...s, password: "" }));
                }}
                placeholder="••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="eye-b"
                aria-label="Parolni ko'rsatish"
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M9.9 5.7A9.7 9.7 0 0112 5.5c6.4 0 10 6.5 10 6.5a17 17 0 01-3.3 4M6.3 7.9A17 17 0 002 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path d="M9.9 9.9a3 3 0 004.2 4.2" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M3 3l18 18" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
                      strokeWidth="1.6"
                    />
                    <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="fld-err">{errors.password}</p>}
          </div>

          {/* Rasm */}
          <div className="fld">
            <div className="fld-label">
              Rasm <span className="opt">(ixtiyoriy)</span>
            </div>
            <div className="file-row">
              <label className="file-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4.5" width="18" height="15" rx="2.5" strokeWidth="1.6" />
                  <circle cx="8.5" cy="10" r="1.8" strokeWidth="1.6" />
                  <path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                {isEdit ? "Rasmni almashtirish" : "Rasm tanlash"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {file ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="file-prev" src={preview} alt="" />
                  <span className="file-name">{file.name}</span>
                  <button
                    type="button"
                    className="file-clear"
                    aria-label="Rasmni olib tashlash"
                    onClick={() => pickFile(null)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                  </button>
                </>
              ) : (
                currentImage && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="file-prev" src={currentImage} alt="" />
                    <span className="file-name">Joriy rasm</span>
                  </>
                )
              )}
            </div>
          </div>

          <div className="cols">
            {/* CHAP: mentor haqida */}
            <div>
              <div className="col-title">Mentor haqida qisqacha ma&apos;lumot</div>

              <div className="fld">
                <div className="fld-label">Tajriba</div>
                <div className="ipt-wrap">
                  <input
                    className="ipt"
                    inputMode="numeric"
                    value={experience}
                    onChange={(e) =>
                      setExperience(e.target.value.replace(/\D/g, "").slice(0, 2))
                    }
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="fld">
                <div className="fld-label">Kasb</div>
                <div className="ipt-wrap">
                  <input
                    className="ipt"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="UI/UX Designer"
                  />
                </div>
              </div>

              <div className="fld">
                <div className="fld-label">Sayt</div>
                <div className="ipt-wrap">
                  <input
                    className="ipt"
                    value={webLink}
                    onChange={(e) => setWebLink(e.target.value)}
                    placeholder="http://sayt.uz"
                  />
                </div>
              </div>

              <div className="fld">
                <div className="fld-label">Qisqacha</div>
                <textarea
                  className="txt"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mentor haqida qisqacha"
                />
              </div>
            </div>

            {/* O'NG: ijtimoiy tarmoqlar */}
            <div>
              <div className="col-title">Ijtimoiy tarmoqlar</div>

              {SOCIALS.map(({ key, label, placeholder, Icon }) => (
                <div className="fld" key={key}>
                  <div className="fld-label">{label}</div>
                  <div className="ipt-wrap">
                    <input
                      className="ipt"
                      value={socials[key]}
                      onChange={(e) =>
                        setSocials((s) => ({ ...s, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
                    />
                    <span className="ipt-ic">
                      <Icon />
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
