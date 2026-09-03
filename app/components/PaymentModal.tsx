"use client";

import { useEffect, useState } from "react";
import {
  API_COURSES,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

export type BuyerOption = { id: number; name: string };
export type CourseOption = { id: number; name: string };

type Props = {
  buyers: BuyerOption[];
  courses: CourseOption[];
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

function uzMessage(raw: string) {
  if (/unique constraint|already/i.test(raw))
    return "Bu kurs allaqachon shu foydalanuvchiga biriktirilgan";
  if (/user not found/i.test(raw)) return "Foydalanuvchi topilmadi";
  if (/course not found/i.test(raw)) return "Kurs topilmadi";
  return raw;
}

export default function PaymentModal({
  buyers,
  courses,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const [userId, setUserId] = useState("");
  const [coursesId, setCoursesId] = useState("");
  const [errors, setErrors] = useState({ userId: "", coursesId: "" });
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

    const next = {
      userId: userId ? "" : "Sotib oluvchi tanlanmadi",
      coursesId: coursesId ? "" : "Kurs tanlanmadi",
    };
    setErrors(next);
    if (next.userId || next.coursesId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      onUnauthorized();
      return;
    }

    setSaving(true);
    try {
      /* endpoint guardsiz, lekin admin panelidan yuborilgani uchun token ham qo'shamiz */
      const res = await fetch(`${API_COURSES}/assignedCourse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(userId),
          coursesId: Number(coursesId),
        }),
      });

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
    } catch (err) {
      console.error("To'lovni saqlashda xato", err);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .pm-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:110;
               display:flex; align-items:center; justify-content:center; padding:24px; }
      .pm-md { background:#fff; border-radius:14px; width:100%; max-width:520px; padding:22px 26px 26px;
               box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
      .pm-md.sm { max-width:400px; padding:36px 28px 32px; text-align:center; }

      .pm-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .pm-title { font-size:21px; font-weight:700; color:#0F172A; }
      .pm-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .pm-x:hover { background:#F1F5F9; }
      .pm-x svg { width:22px; height:22px; }

      .pm-fld { margin-bottom:16px; }
      .pm-label { font-size:14px; font-weight:600; color:#0F172A; margin-bottom:8px; }
      .pm-wrap { position:relative; display:flex; align-items:center; border:1px solid #CBD5E1;
                 border-radius:8px; background:#fff; }
      .pm-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .pm-wrap.err { border-color:#EF4444; }
      .pm-wrap::after { content:""; position:absolute; right:15px; top:50%; width:9px; height:9px;
                        border-right:1.7px solid #64748B; border-bottom:1.7px solid #64748B;
                        transform:translateY(-70%) rotate(45deg); pointer-events:none; }
      .pm-sel { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
                padding:0 36px 0 14px; font-family:inherit; font-size:15px; color:#0F172A;
                cursor:pointer; appearance:none; }
      .pm-err { margin-top:7px; font-size:13.5px; color:#EF4444; }
      .pm-srv { margin:2px 0 14px; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .pm-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                 background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                 font-family:inherit; font-size:15px; font-weight:600; margin-top:6px; }
      .pm-save:hover:not(:disabled) { background:#2F73E0; }
      .pm-save:disabled { opacity:.65; cursor:not-allowed; }
      .pm-save svg { width:19px; height:19px; }
      .pm-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                 border-radius:50%; animation:pm-spin .65s linear infinite; }
      @keyframes pm-spin { to { transform:rotate(360deg); } }

      .pm-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .pm-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .pm-dot svg { width:36px; height:36px; color:#fff; }
      .pm-ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .pm-ok-btn { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none;
                   border-radius:8px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .pm-ok-btn:hover { background:#2F73E0; }
    `}</style>
  );

  if (done) {
    const finish = () => {
      onSaved();
      onClose();
    };
    return (
      <div className="pm-ov" onClick={finish}>
        {styles}
        <div className="pm-md sm" onClick={(e) => e.stopPropagation()}>
          <div className="pm-ring">
            <div className="pm-dot">
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
          <div className="pm-ok-title">Kurs foydalanuvchiga biriktirildi</div>
          <button className="pm-ok-btn" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-ov" onClick={onClose}>
      {styles}
      <div className="pm-md" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <div className="pm-title">To&apos;lov qo&apos;shish</div>
          <button className="pm-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="pm-fld">
            <div className="pm-label">Sotib oluvchi</div>
            <div className={`pm-wrap${errors.userId ? " err" : ""}`}>
              <select
                className="pm-sel"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setErrors((p) => ({ ...p, userId: "" }));
                }}
              >
                <option value="">Tanlang</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.userId && <p className="pm-err">{errors.userId}</p>}
          </div>

          <div className="pm-fld">
            <div className="pm-label">Kurs</div>
            <div className={`pm-wrap${errors.coursesId ? " err" : ""}`}>
              <select
                className="pm-sel"
                value={coursesId}
                onChange={(e) => {
                  setCoursesId(e.target.value);
                  setErrors((p) => ({ ...p, coursesId: "" }));
                }}
              >
                <option value="">Tanlang</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.coursesId && <p className="pm-err">{errors.coursesId}</p>}
          </div>

          {serverErr && <p className="pm-srv">{serverErr}</p>}

          <button className="pm-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="pm-spin" />
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
