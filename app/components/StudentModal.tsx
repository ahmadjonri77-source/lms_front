"use client";

import { useEffect, useState } from "react";
import {
  API_STUDENTS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

/* GET /api/v1/students qaytaradigan shakl */
export type Student = {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  file: string | null;
  role: string;
  status: string;
  create_at: string;
  update_at: string;
};

type Props = {
  /* student berilsa — tahrirlash, bo'lmasa — qo'shish */
  student?: Student | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

const EMPTY_ERRORS = { full_name: "", phone: "", email: "", password: "" };
type Errors = typeof EMPTY_ERRORS;

export default function StudentModal({
  student = null,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const isEdit = !!student;
  const currentImage = student?.file ? `/uploads/images/${student.file}` : "";

  const [fullName, setFullName] = useState(student?.full_name ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "+998");
  const [email, setEmail] = useState(student?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  /* modal yopilganda blob URL bo'sh qolmasin */
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

  const close = () => {
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  };

  const pickFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const validate = () => {
    const next = { ...EMPTY_ERRORS };

    const name = fullName.trim();
    if (name.length < 3 || name.length > 30) next.full_name = "To'liq kiritilmadi";

    if (phone.replace(/\D/g, "").length !== 12) next.phone = "To'liq kiritilmadi";

    // email ixtiyoriy — faqat to'ldirilgan bo'lsa tekshiriladi
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Email noto'g'ri kiritildi";

    // tahrirlashda parol bo'sh qolsa — o'zgarmaydi
    if (!isEdit && password.length < 3) next.password = "To'liq kiritilmadi";
    if (isEdit && password && password.length < 3)
      next.password = "Kamida 3 ta belgi";

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
      // Content-Type qo'yilmaydi — brauzer multipart boundary'ni o'zi qo'shadi
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("phone", phone.trim());
      if (email.trim()) fd.append("email", email.trim());
      if (file) fd.append("file", file);
      // students PATCH parolni hash qilib saqlaydi, shuning uchun tahrirda ham yuboriladi
      if (password) fd.append("password", password);

      const res = await fetch(
        isEdit ? `${API_STUDENTS}/${student!.id}` : API_STUDENTS,
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
      console.error("O'quvchini saqlashda xato", err);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:100;
            display:flex; align-items:center; justify-content:center; padding:24px; }
      .md { background:#fff; border-radius:14px; width:100%; max-width:640px; padding:24px 28px 28px;
            box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:90vh; overflow-y:auto; }
      .md.sm { max-width:390px; padding:34px 28px 30px; }

      .md-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:16px; border-bottom:1px solid #E2E8F0; margin-bottom:20px; }
      .md-title { font-size:21px; font-weight:700; color:#0F172A; }
      .md-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .md-x:hover { background:#F1F5F9; }
      .md-x svg { width:22px; height:22px; }

      .fld { margin-bottom:16px; }
      .fld-label { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600;
                   color:#0F172A; margin-bottom:8px; }
      .fld-label .opt { font-weight:400; font-size:13px; color:#94A3B8; }

      .ipt-wrap { display:flex; align-items:center; border:1px solid #CBD5E1; border-radius:8px; background:#fff; }
      .ipt-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .ipt-wrap.err { border-color:#EF4444; }
      .ipt-wrap.err:focus-within { box-shadow:0 0 0 3px rgba(239,68,68,.12); }
      .ipt { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
             padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .ipt::placeholder { color:#94A3B8; }
      .eye-b { background:transparent; border:none; padding:0 14px; cursor:pointer; color:#64748B; display:inline-flex; }
      .eye-b:hover { color:#0F172A; }
      .eye-b svg { width:19px; height:19px; }
      .fld-err { margin-top:7px; font-size:13.5px; color:#EF4444; }

      .file-row { display:flex; align-items:center; gap:14px; }
      .file-btn { display:inline-flex; align-items:center; gap:9px; height:46px; padding:0 18px;
                  border:1px dashed #CBD5E1; border-radius:8px; background:#F8FAFC; cursor:pointer;
                  font-family:inherit; font-size:14px; font-weight:500; color:#334155; white-space:nowrap; }
      .file-btn:hover { border-color:#93C5FD; background:#F1F7FF; color:#0F172A; }
      .file-btn svg { width:18px; height:18px; }
      .file-prev { width:46px; height:46px; border-radius:8px; object-fit:cover; border:1px solid #E2E8F0; flex-shrink:0; }
      .file-name { font-size:13px; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .file-clear { background:transparent; border:none; padding:4px; cursor:pointer; color:#94A3B8;
                    display:inline-flex; border-radius:6px; flex-shrink:0; }
      .file-clear:hover { color:#B91C1C; background:#FEF2F2; }
      .file-clear svg { width:17px; height:17px; }

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
      .ok-ring { width:96px; height:96px; border-radius:50%; background:#DCFCE7; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .ok-dot { width:66px; height:66px; border-radius:50%; background:#22C55E;
                display:flex; align-items:center; justify-content:center; }
      .ok-dot svg { width:34px; height:34px; color:#fff; }
      .ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .btn-ok { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none; border-radius:8px;
                cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .btn-ok:hover { background:#2F73E0; }
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
              {isEdit ? "Muvaffaqiyatli saqlandi" : "Muvaffaqiyatli qo'shildi"}
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
          {/* F.I.Sh */}
          <div className="fld">
            <div className="fld-label">F.I.Sh</div>
            <div className={`ipt-wrap${errors.full_name ? " err" : ""}`}>
              <input
                className="ipt"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((p) => ({ ...p, full_name: "" }));
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
                  setPhone(v.startsWith("+998") ? v : "+998");
                  setErrors((p) => ({ ...p, phone: "" }));
                }}
                placeholder="+998"
              />
            </div>
            {errors.phone && <p className="fld-err">{errors.phone}</p>}
          </div>

          {/* Email — ixtiyoriy */}
          <div className="fld">
            <div className="fld-label">
              Email <span className="opt">(ixtiyoriy)</span>
            </div>
            <div className={`ipt-wrap${errors.email ? " err" : ""}`}>
              <input
                className="ipt"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: "" }));
                }}
                placeholder="example@mail.com"
              />
            </div>
            {errors.email && <p className="fld-err">{errors.email}</p>}
          </div>

          {/* Rasm — ixtiyoriy; yuklanmasa ro'yxatda ism bosh harfi ko'rinadi */}
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

          {/* Parol — tahrirlashda ixtiyoriy */}
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
                  setErrors((p) => ({ ...p, password: "" }));
                }}
                placeholder="••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="eye-b"
                aria-label="Parolni ko'rsatish"
                onClick={() => setShowPass((s) => !s)}
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
