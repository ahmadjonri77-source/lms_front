"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const RESET_URL = "/api/v1/auth/resetPassword";
const OTP_BOT = "n105_lms_bot";

type ApiResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

async function parseResponse(res: Response): Promise<ApiResponse> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return (await res.json()) as ApiResponse;
    } catch {
      return { message: "Serverdan noto'g'ri javob keldi" };
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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("+998");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phoneErr, setPhoneErr] = useState("");
  const [otpErr, setOtpErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [serverErr, setServerErr] = useState("");

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const otpDigits = otp.replace(/\D/g, "");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val.startsWith("+998")) {
      setPhone("+998");
      return;
    }
    const digits = val.slice(4).replace(/\D/g, "").slice(0, 9);
    setPhone("+998" + digits);
    setPhoneErr("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    let valid = true;

    if (phone.length < 13) {
      setPhoneErr("Telefon raqamni to'liq kiriting");
      valid = false;
    } else {
      setPhoneErr("");
    }

    if (otpDigits.length !== 6) {
      setOtpErr("Tasdiqlash kodi 6 xonali bo'lishi kerak");
      valid = false;
    } else {
      setOtpErr("");
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

    setLoading(true);

    try {
      const res = await fetch(RESET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpDigits, password }),
      });
      const data = await parseResponse(res);

      if (!res.ok || data.success === false) {
        setServerErr(errText(data, "Parolni yangilashda xatolik yuz berdi"));
        return;
      }

      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        router.push("/login");
      }, 1600);
    } catch (error) {
      console.error("Reset request failed", error);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { min-height: 100%; }

        .page {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
        }

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
          width: 80%;
          height: 80%;
        }

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

        .logo {
          display: flex;
          align-items: center;
          gap: 1px;
          align-self: flex-end;
          margin-bottom: 40px;
        }

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
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }

        .help-text {
          font-size: 13.5px;
          color: #666;
          text-align: center;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .hint-bot {
          color: #3D85F5;
          font-weight: 700;
          text-decoration: none;
        }

        .hint-bot:hover { text-decoration: underline; }

        .field { margin-bottom: 14px; }

        .label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 7px;
        }

        .req { color: #F55; margin-left: 2px; }

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

        .input::placeholder { color: #C0C0C0; }

        .otp-input {
          letter-spacing: 3px;
          font-weight: 600;
        }

        .input-icon {
          padding: 0 13px;
          display: flex;
          align-items: center;
          color: #B0B0B0;
        }

        .icon-btn {
          padding: 0 13px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #B0B0B0;
          transition: color 0.15s;
        }

        .icon-btn:hover { color: #3D85F5; }

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

        .server-err {
          background: #FDF2F2;
          border: 1px solid #F3C9C9;
          border-radius: 10px;
          padding: 12px 14px;
          color: #B32626;
          font-size: 13px;
          line-height: 1.55;
          margin: 12px 0 4px;
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
          margin-top: 14px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2872e0;
          box-shadow: 0 4px 16px rgba(61,133,245,0.35);
        }

        .submit-btn:active:not(:disabled) { transform: scale(0.99); }

        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .back-link {
          display: block;
          text-align: center;
          margin-top: 18px;
          color: #3D85F5;
          font-size: 13px;
          text-decoration: none;
          font-weight: 600;
        }

        .back-link:hover { text-decoration: underline; }

        /* modal */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
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
          max-width: 380px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          font-family: 'Inter', sans-serif;
          animation: pop 0.2s ease;
        }

        @keyframes pop {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-icon {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: #E9F8EF;
          color: #22B573;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #111;
          margin-bottom: 8px;
        }

        .modal-sub {
          font-size: 13.5px;
          color: #666;
          line-height: 1.55;
        }

        @media (max-width: 800px) {
          .page { flex-direction: column; }
          .left { flex: none; height: 40vh; min-height: 0; width: 100%; }
          .right { flex: none; width: 100%; padding: 32px 24px 40px; }
        }
      `}</style>

      <div className="page">
        <div className="left">
          <div className="left-inner">
            <Image
              src="/login.svg"
              alt="Parolni unutdingizmi?"
              fill
              className="illus-img"
              priority
            />
          </div>
        </div>

        <div className="right">
          <div className="logo">
            <Image src="/logo.svg" alt="IT Live Academy" width={120} height={34} priority />
          </div>

          <div className="form-wrap">
            <h1 className="title">Parolni tiklash</h1>
            <p className="help-text">
              Telefon raqamingizni kiriting va tasdiqlash kodini telegram bot:{" "}
              <a
                className="hint-bot"
                href={`https://t.me/${OTP_BOT}`}
                target="_blank"
                rel="noreferrer"
              >
                @{OTP_BOT}
              </a>{" "}
              dan oling, so&apos;ng yangi parolni belgilang.
            </p>

            <form onSubmit={handleSubmit} noValidate>
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

              {/* OTP */}
              <div className="field">
                <label htmlFor="otp" className="label">
                  Tasdiqlash kodi <span className="req">*</span>
                </label>
                <div className={`input-wrap ${otpErr ? "err" : ""}`}>
                  <input
                    id="otp"
                    className="input otp-input"
                    value={otp}
                    onChange={(e) => { setOtp(formatOtp(e.target.value)); setOtpErr(""); }}
                    placeholder="000-000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handlePasteOtp}
                    aria-label="Kodni qo'yish"
                    title="Kodni qo'yish"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {otpErr && <p className="err-msg">{otpErr}</p>}
              </div>

              {/* Yangi parol */}
              <div className="field">
                <label htmlFor="password" className="label">
                  Yangi parol <span className="req">*</span>
                </label>
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
                    className="icon-btn"
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

              {/* Tasdiqlash */}
              <div className="field">
                <label htmlFor="confirm" className="label">
                  Yangi parolni tasdiqlang <span className="req">*</span>
                </label>
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
                    className="icon-btn"
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

              {serverErr && <p className="server-err">{serverErr}</p>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <span className="spinner" /> : "Parolni yangilash"}
              </button>
            </form>

            <a href="/login" className="back-link">Kirish sahifasiga qaytish</a>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="modal-title">Parol muvaffaqiyatli yangilandi</div>
            <div className="modal-sub">Siz kirish sahifasiga yo&apos;naltirilmoqdasiz...</div>
          </div>
        </div>
      )}
    </>
  );
}
