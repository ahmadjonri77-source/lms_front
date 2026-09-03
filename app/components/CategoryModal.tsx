"use client";

import { useEffect, useState } from "react";
import {
  API_CATEGORIES,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

export type Category = {
  id: number;
  name: string;
  create_at: string;
  update_at: string;
};

type Props = {
  /* null bo'lsa — yangi kategoriya qo'shiladi */
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

const NAME_MIN = 3;
const NAME_MAX = 50;

/* backend xabarlari inglizcha keladi — eng ko'p uchraydiganini tarjima qilamiz */
function uzMessage(raw: string) {
  if (/already exist/i.test(raw)) return "Bu nomli kategoriya allaqachon mavjud";
  return raw;
}

export default function CategoryModal({
  category,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const [name, setName] = useState(category?.name ?? "");
  const [err, setErr] = useState("");
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    const value = name.trim();
    if (value.length < NAME_MIN) {
      setErr(`Kategoriya nomi kamida ${NAME_MIN} ta belgidan iborat bo'lsin`);
      return;
    }
    if (value.length > NAME_MAX) {
      setErr(`Kategoriya nomi ${NAME_MAX} ta belgidan oshmasin`);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      onUnauthorized();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        category ? `${API_CATEGORIES}/${category.id}` : API_CATEGORIES,
        {
          method: category ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: value }),
        },
      );

      const body = await readBody<ApiError>(res);

      if (!res.ok) {
        if (isAuthError(res, body)) {
          localStorage.removeItem("token");
          onUnauthorized();
          return;
        }
        setServerErr(uzMessage(errorMessage(body, "Saqlab bo'lmadi")));
        return;
      }

      setDone(true);
    } catch (e2) {
      console.error("Kategoriyani saqlashda xato", e2);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .ct-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:110;
               display:flex; align-items:center; justify-content:center; padding:24px; }
      .ct-md { background:#fff; border-radius:14px; width:100%; max-width:640px; padding:22px 26px 26px;
               box-shadow:0 24px 60px rgba(2,6,23,.28); }
      .ct-md.sm { max-width:400px; padding:36px 28px 32px; text-align:center; }

      .ct-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .ct-title { font-size:21px; font-weight:700; color:#0F172A; }
      .ct-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .ct-x:hover { background:#F1F5F9; }
      .ct-x svg { width:22px; height:22px; }

      .ct-label { font-size:14px; font-weight:600; color:#0F172A; margin-bottom:8px; }
      .ct-wrap { display:flex; align-items:center; border:1px solid #CBD5E1; border-radius:8px; background:#fff; }
      .ct-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .ct-wrap.err { border-color:#EF4444; }
      .ct-input { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
                  padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .ct-input::placeholder { color:#94A3B8; }
      .ct-err { margin-top:7px; font-size:13.5px; color:#EF4444; }
      .ct-srv { margin:12px 0 0; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .ct-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                 background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                 font-family:inherit; font-size:15px; font-weight:600; margin-top:18px; }
      .ct-save:hover:not(:disabled) { background:#2F73E0; }
      .ct-save:disabled { opacity:.65; cursor:not-allowed; }
      .ct-save svg { width:19px; height:19px; }
      .ct-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                 border-radius:50%; animation:ct-spin .65s linear infinite; }
      @keyframes ct-spin { to { transform:rotate(360deg); } }

      .ct-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .ct-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .ct-dot svg { width:36px; height:36px; color:#fff; }
      .ct-ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .ct-ok-btn { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none;
                   border-radius:8px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .ct-ok-btn:hover { background:#2F73E0; }
    `}</style>
  );

  if (done) {
    const finish = () => {
      onSaved();
      onClose();
    };
    return (
      <div className="ct-ov" onClick={finish}>
        {styles}
        <div className="ct-md sm" onClick={(e) => e.stopPropagation()}>
          <div className="ct-ring">
            <div className="ct-dot">
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
          <div className="ct-ok-title">
            {category
              ? "Muvaffaqiyatli o'zgartirildi"
              : "Muvaffaqiyatli qo'shildi"}
          </div>
          <button className="ct-ok-btn" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-ov" onClick={onClose}>
      {styles}
      <div className="ct-md" onClick={(e) => e.stopPropagation()}>
        <div className="ct-head">
          <div className="ct-title">
            {category ? "Tahrirlash" : "Qo'shish"}
          </div>
          <button className="ct-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="ct-label">Kategoriya nomi</div>
          <div className={`ct-wrap${err ? " err" : ""}`}>
            <input
              className="ct-input"
              value={name}
              autoFocus
              maxLength={NAME_MAX}
              placeholder="Kategoriya nomi"
              onChange={(e) => {
                setName(e.target.value);
                setErr("");
              }}
            />
          </div>
          {err && <p className="ct-err">{err}</p>}
          {serverErr && <p className="ct-srv">{serverErr}</p>}

          <button className="ct-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="ct-spin" />
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
