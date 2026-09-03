"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  assignCourse,
  clearPendingCourse,
  readPendingCourse,
  savePendingCourse,
  userIdFromRegisterResponse,
  userIdViaLogin,
} from "../lib/purchase";

const VERIFY_OTP_URL = "/api/v1/auth/verify-otp";
const REGISTER_URL = "/api/v1/students";

const OTP_BOT = "n105_lms_bot";
const ADMIN_USERNAME = "Rikhsiboyev_77";

type ApiResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

// backend xatolarni har xil ko'rinishda qaytaradi: {message: "..."}, {message: ["...","..."]}
async function parseResponse(res: Response): Promise<ApiResponse> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return (await res.json()) as ApiResponse;
    } catch {
      return {};
    }
  }
  const text = await res.text();
  return text ? { message: text } : {};
}

function errText(data: ApiResponse, fallback: string) {
  const msg = data.message ?? data.error;
  if (Array.isArray(msg)) return msg[0] || fallback;
  return msg || fallback;
}

// 123456 -> 123-456
function formatOtp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [nameErr, setNameErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [confirmErr, setConfirmErr] = useState("");

  // modallar
  const [otpOpen, setOtpOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [courseNote, setCourseNote] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [otpErr, setOtpErr] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const otpDigits = otp.replace(/\D/g, "");

  /* kurs sahifasidan "Sotib olish" bilan kelingan bo'lsa, kursni eslab qolamiz */
  useEffect(() => {
    const courseId = Number(
      new URLSearchParams(window.location.search).get("courseId"),
    );
    if (courseId) savePendingCourse(courseId);
  }, []);

  const closeOtp = () => {
    setOtpOpen(false);
    setOtp("");
    setOtpErr("");
  };

  // modal ochiq bo'lganda orqa fon scroll qilmasin + Esc bilan yopilsin
  useEffect(() => {
    if (!otpOpen && !successOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (otpOpen && !otpLoading) closeOtp();
      if (successOpen) setSuccessOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [otpOpen, successOpen, otpLoading]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val.startsWith("+998")) {
      setPhone("+998");
      return;
    }
    // faqat raqam qoldiramiz: +998 dan keyin 9 ta raqam
    const digits = val.slice(4).replace(/\D/g, "").slice(0, 9);
    setPhone("+998" + digits);
    setPhoneErr("");
  };

  // 1-qadam: forma tekshiriladi, hech qanday so'rov ketmaydi — faqat OTP modal ochiladi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;

    if (fullName.trim().length < 3) {
      setNameErr("To'liq ismingizni kiriting");
      valid = false;
    } else {
      setNameErr("");
    }

    if (phone.length < 13) {
      setPhoneErr("Telefon raqamni to'liq kiriting");
      valid = false;
    } else {
      setPhoneErr("");
    }

    if (password.length < 6) {
      setPassErr("Parol kamida 6 ta belgidan iborat bo'lsin");
      valid = false;
    } else {
      setPassErr("");
    }

    if (confirm !== password || !confirm) {
      setConfirmErr("Parollar mos kelmadi");
      valid = false;
    } else {
      setConfirmErr("");
    }

    if (!valid) return;

    setOtp("");
    setOtpErr("");
    setOtpOpen(true);
  };

  const handlePasteOtp = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const formatted = formatOtp(text);
      if (formatted) {
        setOtp(formatted);
        setOtpErr("");
      }
    } catch {
      setOtpErr("Clipboarddan o'qib bo'lmadi, kodni qo'lda kiriting");
    }
  };

  // 2-qadam: avval OTP tekshiriladi, faqat true bo'lsa ro'yxatdan o'tkaziladi
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpDigits.length !== 6) {
      setOtpErr("Tasdiqlash kodi 6 xonali bo'lishi kerak");
      return;
    }

    setOtpErr("");
    setOtpLoading(true);

    try {
      // --- verify-otp ---
      const verifyRes = await fetch(VERIFY_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpDigits }),
      });
      const verifyData = await parseResponse(verifyRes);

      if (!verifyRes.ok || verifyData.success === false) {
        setOtpErr(errText(verifyData, "OTP noto'g'ri yoki muddati tugagan"));
        return;
      }

      // --- register (OTP tasdiqlangandan keyin) ---
      const regRes = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone,
          password,
        }),
      });
      const regData = await parseResponse(regRes);

      if (!regRes.ok || regData.success === false) {
        const msg = errText(regData, "Ro'yxatdan o'tishda xato yuz berdi");
        // POST /students AuthGuard ostida: tokensiz so'rov "Unauthorized" bilan qaytadi
        setOtpErr(
          /unauthorized|forbidden/i.test(msg)
            ? "Ro'yxatdan o'tish serverda yopiq: /students endpointi faqat admin uchun ochiq"
            : msg,
        );
        return;
      }

      // --- tanlangan kursni yangi foydalanuvchiga biriktirish ---
      const coursesId = readPendingCourse();
      if (coursesId) {
        // id avval javobdan, bo'lmasa login orqali olinadi
        const userId =
          userIdFromRegisterResponse(regData) ??
          (await userIdViaLogin(phone, password));

        if (userId) {
          const assigned = await assignCourse(userId, coursesId);
          if (assigned.ok) {
            clearPendingCourse();
            setCourseNote({ ok: true, text: "Tanlagan kursingiz hisobingizga biriktirildi." });
          } else {
            setCourseNote({ ok: false, text: assigned.message });
          }
        } else {
          setCourseNote({
            ok: true,
            text: "Tanlagan kursingiz saqlandi — hisobingiz faollashtirilgach, birinchi kirishingizda biriktiriladi.",
          });
        }
      } else {
        setCourseNote(null);
      }

      setOtpOpen(false);
      setOtp("");
      setSuccessOpen(true);
    } catch (error) {
      console.error("Register request failed", error);
      setOtpErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }

        .page {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
        }

        /* LEFT */
        .left {
          flex: 0 0 60%;
          background: #EDF4FB;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 100vh;
        }

        .left-inner {
          position: relative;
          z-index: 1;
          display: block;
          width: 80%;
          height: 80%;
        }

        /* RIGHT */
        .right {
          flex: 0 0 40%;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 36px 48px 48px;
          position: relative;
          overflow-y: auto;
        }

        /* LOGO */
        .logo {
          display: flex;
          align-items: center;
          gap: 1px;
          align-self: flex-end;
          margin-bottom: 40px;
        }

        /* FORM */
        .form-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 360px;
          width: 100%;
          margin: auto;
        }

        .title {
          font-size: 26px;
          font-weight: 700;
          color: #111;
          text-align: center;
          margin-bottom: 28px;
          letter-spacing: -0.3px;
        }

        .field {
          margin-bottom: 14px;
        }

        .label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 7px;
        }

        .req {
          color: #F55;
          margin-left: 2px;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          border: 1px solid #E0E0E0;
          border-radius: 8px;
          background: #FAFAFA;
          transition: border-color 0.18s, box-shadow 0.18s;
          overflow: hidden;
        }

        .input-wrap:focus-within {
          border-color: #3D85F5;
          box-shadow: 0 0 0 3px rgba(61, 133, 245, 0.12);
          background: #fff;
        }

        .input-wrap.err {
          border-color: #F55;
          background: #fff8f8;
        }

        .input {
          flex: 1;
          padding: 12px 14px;
          font-size: 14px;
          font-family: inherit;
          color: #111;
          border: none;
          outline: none;
          background: transparent;
        }

        .input::placeholder {
          color: #C0C0C0;
        }

        .input-icon {
          padding: 0 13px;
          display: flex;
          align-items: center;
          color: #B0B0B0;
        }

        .eye-btn {
          padding: 0 13px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #B0B0B0;
          transition: color 0.15s;
        }

        .eye-btn:hover { color: #555; }

        .err-msg {
          color: #F44;
          font-size: 12px;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .err-msg::before {
          content: '';
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #F44;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 3.5v4M7 9.5v.5' stroke='white' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-size: cover;
          flex-shrink: 0;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #3D85F5;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          letter-spacing: 0.2px;
          transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 50px;
          margin-top: 10px;
          margin-bottom: 20px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2872e0;
          box-shadow: 0 4px 16px rgba(61,133,245,0.35);
        }

        .submit-btn:active:not(:disabled) {
          transform: scale(0.99);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-text {
          text-align: center;
          font-size: 13px;
          color: #777;
        }

        .login-link {
          color: #3D85F5;
          font-weight: 600;
          text-decoration: none;
        }

        .login-link:hover { text-decoration: underline; }

        /* ===== MODAL ===== */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 50;
          animation: fade 0.18s ease;
        }

        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          padding: 30px 32px 32px;
          position: relative;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          font-family: 'Inter', sans-serif;
          animation: pop 0.2s ease;
        }

        @keyframes pop {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: #555;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          transition: background 0.15s;
        }

        .modal-close:hover { background: #F2F2F2; }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          color: #111;
          margin: 6px 0 24px;
          letter-spacing: -0.4px;
        }

        .modal-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #222;
          margin-bottom: 8px;
        }

        .otp-wrap {
          display: flex;
          align-items: center;
          border: 1px solid #E0E0E0;
          border-radius: 12px;
          background: #fff;
          overflow: hidden;
          transition: border-color 0.18s, box-shadow 0.18s;
        }

        .otp-wrap:focus-within {
          border-color: #3D85F5;
          box-shadow: 0 0 0 3px rgba(61,133,245,0.12);
        }

        .otp-wrap.err { border-color: #F55; background: #fff8f8; }

        .otp-input {
          flex: 1;
          padding: 15px 18px;
          font-size: 18px;
          font-family: inherit;
          font-weight: 600;
          letter-spacing: 3px;
          color: #111;
          border: none;
          outline: none;
          background: transparent;
        }

        .otp-input::placeholder {
          color: #C4C4C4;
          font-weight: 500;
        }

        .paste-btn {
          padding: 0 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: #777;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .paste-btn:hover { color: #3D85F5; }

        .modal-hint {
          text-align: center;
          font-size: 13.5px;
          line-height: 1.55;
          color: #666;
          margin: 18px 0 20px;
        }

        .hint-bot {
          color: #3D85F5;
          font-weight: 700;
          text-decoration: none;
        }

        .hint-bot:hover { text-decoration: underline; }

        .modal-btn {
          width: 100%;
          padding: 15px;
          background: #3D85F5;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 52px;
          transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
        }

        .modal-btn:hover:not(:disabled) {
          background: #2872e0;
          box-shadow: 0 6px 18px rgba(61,133,245,0.35);
        }

        .modal-btn:active:not(:disabled) { transform: scale(0.99); }

        .modal-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* success */
        .success-icon {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: #E9F8EF;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 8px auto 20px;
          color: #22B573;
        }

        .success-text {
          text-align: center;
          font-size: 14px;
          line-height: 1.6;
          color: #666;
          margin-bottom: 24px;
        }

        .success-admin {
          display: block;
          color: #3D85F5;
          font-weight: 700;
          text-decoration: none;
          margin-top: 2px;
        }

        .success-admin:hover { text-decoration: underline; }

        .later-btn {
          display: block;
          width: 100%;
          margin-top: 14px;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: #777;
          cursor: pointer;
          padding: 8px;
        }

        .later-btn:hover { color: #333; }

        @media (max-width: 800px) {
          .page { flex-direction: column; }
          .left { flex: none; height: 40vh; min-height: 0; width: 100%; }
          .right { flex: none; width: 100%; padding: 32px 24px 40px; }
          .modal { padding: 26px 22px 28px; }
        }
      `}</style>

      <div className="page">
        {/* CHAP – Illustration */}
        <div className="left">
          <div className="left-inner">
            <Image
              src="/login.svg"
              alt="IT Live Academy"
              fill
              className="illus-img"
              priority
            />
          </div>
        </div>

        {/* O'NG – Form */}
        <div className="right">
          <div className="logo">
            <Image
              src="/logo.svg"
              alt="IT Live Academy"
              width={120}
              height={34}
              priority
            />
          </div>

          <div className="form-wrap">
            <h1 className="title">Ro&apos;yxatdan o&apos;tish</h1>

            <form onSubmit={handleSubmit} noValidate>
              {/* To'liq ism */}
              <div className="field">
                <label htmlFor="fullName" className="label">
                  To&apos;liq ismingizni kiriting <span className="req">*</span>
                </label>
                <div className={`input-wrap ${nameErr ? "err" : ""}`}>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setNameErr(""); }}
                    className="input"
                    placeholder="Kiritish"
                    autoComplete="name"
                  />
                  <span className="input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
                {nameErr && <p className="err-msg">{nameErr}</p>}
              </div>

              {/* Telefon */}
              <div className="field">
                <label htmlFor="phone" className="label">
                  Telefon raqamingiz <span className="req">*</span>
                </label>
                <div className={`input-wrap ${phoneErr ? "err" : ""}`}>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="input"
                    maxLength={13}
                    autoComplete="tel"
                  />
                  <span className="input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M11 18.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
                {phoneErr && <p className="err-msg">{phoneErr}</p>}
              </div>

              {/* Parol */}
              <div className="field">
                <label htmlFor="password" className="label">Parolni kiriting</label>
                <div className={`input-wrap ${passErr ? "err" : ""}`}>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPassErr(""); }}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Parolni ko'rsatish"
                  >
                    {showPass ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>
                {passErr && <p className="err-msg">{passErr}</p>}
              </div>

              {/* Parolni tasdiqlash */}
              <div className="field">
                <label htmlFor="confirm" className="label">Parolni tasdiqlang</label>
                <div className={`input-wrap ${confirmErr ? "err" : ""}`}>
                  <input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setConfirmErr(""); }}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Parolni ko'rsatish"
                  >
                    {showConfirm ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmErr && <p className="err-msg">{confirmErr}</p>}
              </div>

              <button type="submit" className="submit-btn">
                Davom etish
              </button>
            </form>

            <p className="login-text">
              Menda hisob mavjud!{" "}
              <a href="/login" className="login-link">Kirish</a>
            </p>
          </div>
        </div>
      </div>

      {/* ===== OTP MODAL ===== */}
      {otpOpen && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !otpLoading) closeOtp();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="otp-title">
            <button
              type="button"
              className="modal-close"
              onClick={closeOtp}
              disabled={otpLoading}
              aria-label="Yopish"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <h2 id="otp-title" className="modal-title">Tasdiqlash kodi</h2>

            <form onSubmit={handleVerifyAndRegister} noValidate>
              <label htmlFor="otp" className="modal-label">
                Tasdiqlash kodi <span className="req">*</span>
              </label>

              <div className={`otp-wrap ${otpErr ? "err" : ""}`}>
                <input
                  id="otp"
                  className="otp-input"
                  value={otp}
                  onChange={(e) => { setOtp(formatOtp(e.target.value)); setOtpErr(""); }}
                  placeholder="000-000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />
                <button
                  type="button"
                  className="paste-btn"
                  onClick={handlePasteOtp}
                  aria-label="Kodni qo'yish"
                  title="Kodni qo'yish"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {otpErr && <p className="err-msg">{otpErr}</p>}

              <p className="modal-hint">
                Tasdiqlash kodi kiritilgan telefon raqamining telegram akkaunti orqali telegram bot:{" "}
                <a
                  className="hint-bot"
                  href={`https://t.me/${OTP_BOT}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{OTP_BOT}
                </a>{" "}
                dan tasdiqlash kodini oling!
              </p>

              <button type="submit" className="modal-btn" disabled={otpLoading}>
                {otpLoading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    Davom etish
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== SUCCESS MODAL ===== */}
      {successOpen && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSuccessOpen(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <button
              type="button"
              className="modal-close"
              onClick={() => setSuccessOpen(false)}
              aria-label="Yopish"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="success-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M21.5 3.5L2.8 10.6c-.9.35-.88 1.63.03 1.95l4.6 1.6 1.75 5.2c.28.83 1.36 1.02 1.9.33l2.4-3.05 4.7 3.45c.6.44 1.46.11 1.62-.62l3.2-14.3c.17-.75-.58-1.38-1.5-1.06z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M7.43 14.15L18.5 6.2l-8.6 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 id="success-title" className="modal-title">
              Ro&apos;yxatdan muvaffaqiyatli o&apos;tdingiz!
            </h2>

            {courseNote && (
              <p
                className="success-text"
                style={{ color: courseNote.ok ? undefined : "#DC2626" }}
              >
                {courseNote.text}
              </p>
            )}

            <p className="success-text">
              Kursni xarid qilish uchun adminga murojaat qiling:
              <a
                className="success-admin"
                href={`https://t.me/${ADMIN_USERNAME}`}
                target="_blank"
                rel="noreferrer"
              >
                @{ADMIN_USERNAME}
              </a>
            </p>

            <a
              className="modal-btn"
              href={`https://t.me/${ADMIN_USERNAME}`}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21.5 3.5L2.8 10.6c-.9.35-.88 1.63.03 1.95l4.6 1.6 1.75 5.2c.28.83 1.36 1.02 1.9.33l2.4-3.05 4.7 3.45c.6.44 1.46.11 1.62-.62l3.2-14.3c.17-.75-.58-1.38-1.5-1.06z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Telegramga o&apos;tish
            </a>

            <button
              type="button"
              className="later-btn"
              onClick={() => { setSuccessOpen(false); router.push("/login"); }}
            >
              Keyinroq
            </button>
          </div>
        </div>
      )}
    </>
  );
}
