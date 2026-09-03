"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { flushPendingCourse } from "../lib/purchase";
import { decodeToken } from "../lib/auth";

const API_URL = "/api/v1/auth/login";
const ADMIN_USERNAME = "Rikhsiboyev_77";

type LoginResponseData = {
  // backend `accessToken` qaytaradi; qolganlari ehtimoliy variantlar
  accessToken?: string;
  access_token?: string;
  token?: string;
  role?: string;
  message?: string | string[];
  error?: string;
};

// backend {message: "..."} ham, {message: ["...","..."]} ham qaytarishi mumkin
function errText(data: LoginResponseData | null) {
  const msg = data?.message ?? data?.error;
  if (Array.isArray(msg)) return msg[0] || "";
  return msg || "";
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phoneErr, setPhoneErr] = useState(false);
  const [passErr, setPassErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [inactive, setInactive] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val.startsWith("+998")) {
      setPhone("+998");
      return;
    }
    setPhone(val);
    setPhoneErr(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;
    setServerErr("");
    setInactive(false);

    if (phone.length < 13) {
      setPhoneErr(true);
      valid = false;
    } else {
      setPhoneErr(false);
    }

    if (password.length < 4) {
      setPassErr(true);
      valid = false;
    } else {
      setPassErr(false);
    }

    if (!valid) return;

    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const contentType = res.headers.get("content-type") || "";

      let data: LoginResponseData | null = null;

      if (contentType.includes("application/json")) {
        try {
          data = await res.json() as LoginResponseData;
        } catch {
          data = { message: "Serverdan noto'g'ri javob keldi" };
        }
      } else {
        const text = await res.text();
        data = text ? { message: text } : {};
      }

      if (res.ok) {
        const accessToken =
          data?.accessToken || data?.access_token || data?.token;

        // token kelmasa /dashboard ga o'tmaymiz — aks holda guard
        // qaytarib /login ga tashlaydi va sabab ko'rinmaydi
        if (!accessToken) {
          setServerErr("Serverdan token kelmadi, qaytadan urinib ko'ring");
          return;
        }

        localStorage.setItem("token", accessToken);
        // kurs sahifasidan tanlangan kurs bo'lsa shu yerda biriktiriladi
        await flushPendingCourse(accessToken);
        // rol login javobida ham, token payloadida ham keladi
        const role = data?.role ?? decodeToken(accessToken)?.role;
        router.push(role === "STUDENT" ? "/student" : "/dashboard");
      } else {
        const msg = errText(data);

        // status ACTIVE emas: login/parol xato emas, shuning uchun alohida xabar
        if (/not\s*active/i.test(msg)) {
          setPhoneErr(false);
          setPassErr(false);
          setInactive(true);
        } else {
          setPhoneErr(true);
          setPassErr(true);
          setServerErr(msg || "Login yoki parol xato kiritildi");
        }
      }
    } catch (error) {
      console.error("Login request failed", error);
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

        // .illus-img {
        //   width: 100%;
        //   height: 100%;
        //   object-fit: cover;
        //   object-position: center;
        //   display: block;
        //   user-select: none;
        // }

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
          margin-bottom: 60px;
        }

        .logo-it {
          font-size: 22px;
          font-weight: 800;
          color: #1a1a1a;
          font-style: italic;
          letter-spacing: -0.5px;
        }

        .logo-live {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.5px;
        }

        .logo-dot {
          width: 7px;
          height: 7px;
          background: #14B8A6;
          border-radius: 50%;
          margin-left: 2px;
          margin-bottom: 14px;
          flex-shrink: 0;
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
          margin-bottom: 4px;
        }

        .label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 7px;
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
          margin-bottom: 8px;
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

        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 7px;
          margin-bottom: 20px;
        }

        .forgot-link {
          font-size: 13px;
          color: #3D85F5;
          text-decoration: none;
          font-weight: 500;
        }

        .forgot-link:hover { text-decoration: underline; }

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

        .server-err {
          text-align: center;
          color: #F44;
          font-size: 13px;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .inactive-box {
          background: #FDF2F2;
          border: 1px solid #F3C9C9;
          border-radius: 10px;
          padding: 15px 17px;
          margin-bottom: 18px;
          color: #B32626;
          font-size: 13.5px;
          line-height: 1.6;
        }

        .inactive-link {
          display: inline-block;
          margin-top: 4px;
          color: #B32626;
          font-weight: 700;
          text-decoration: underline;
        }

        .register-text {
          text-align: center;
          font-size: 13px;
          color: #777;
        }

        .register-link {
          color: #3D85F5;
          font-weight: 600;
          text-decoration: none;
        }

        .register-link:hover { text-decoration: underline; }

        @media (max-width: 800px) {
          .page { flex-direction: column; }
          .left { flex: none; height: 50vh; width: 100%; }
          .right { flex: none; width: 100%; padding: 32px 24px 40px; }
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
          {/* Logo */}
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
            <h1 className="title">Kirish</h1>

            <form onSubmit={handleSubmit} noValidate>
              {/* Telefon */}
              <div className="field">
                <label htmlFor="phone" className="label">Telefon raqamingiz</label>
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor" />
                    </svg>
                  </span>
                </div>
                {phoneErr && (
                  <p className="err-msg">Login yoki parol xato kiritildi</p>
                )}
              </div>

              {/* Parol */}
              <div className="field">
                <label htmlFor="password" className="label">Parol</label>
                <div className={`input-wrap ${passErr ? "err" : ""}`}>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPassErr(false); }}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Parolni ko'rsatish"
                  >
                    {showPass ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                </div>
                {passErr && (
                  <p className="err-msg">Login yoki parol xato kiritildi</p>
                )}
              </div>

              {/* Forgot */}
              <div className="forgot-row">
                <a href="/login/forgot" className="forgot-link">Parolni unutdingizmi?</a>
              </div>

              {/* Status ACTIVE emas */}
              {inactive && (
                <div className="inactive-box">
                  To&apos;lovingiz hali admin tomonidan tasdiqlanmagan. Iltimos, kuting
                  yoki adminga murojaat qiling. Adminga murojaat:{" "}
                  <a
                    className="inactive-link"
                    href={`https://t.me/${ADMIN_USERNAME}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{ADMIN_USERNAME}
                  </a>
                </div>
              )}

              {/* Server error */}
              {serverErr && <p className="server-err">{serverErr}</p>}

              {/* Submit */}
              <button
                id="login-btn"
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Kirish"}
              </button>
            </form>

            <p className="register-text">
              Menda hisob mavjud emas!{" "}
              <a href="/register" className="register-link">Ro&apos;yxatdan o&apos;tish</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
