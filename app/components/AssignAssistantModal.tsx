"use client";

import { useEffect, useState } from "react";
import {
  API_COURSES,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";
import type { Course } from "./CourseModal";

type Option = { id: number; name: string };

type Props = {
  course: Course;
  assistants: Option[];
  /* backend PATCH'da mentorning user id'sini talab qiladi (kursdagi mentorId — profil id'si) */
  mentorUserId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

export default function AssignAssistantModal({
  course,
  assistants,
  mentorUserId,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const [assistantId, setAssistantId] = useState(
    course.assistantId ? String(course.assistantId) : "",
  );
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
    if (!assistantId) {
      setErr("Assistent tanlanmadi");
      return;
    }
    if (!mentorUserId) {
      setServerErr("Kurs mentori aniqlanmadi — mentorlar ro'yxati yuklanmagan");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      onUnauthorized();
      return;
    }

    setSaving(true);
    try {
      /* backend PATCH'da mentorId'ni tekshiradi, `name` esa joriysi bilan bir xil
         bo'lmasa noyoblikka tekshiriladi — shuning uchun ikkalasi ham yuboriladi */
      const fd = new FormData();
      fd.append("name", course.name);
      fd.append("mentorId", String(mentorUserId));
      fd.append("assistantId", assistantId);

      const res = await fetch(`${API_COURSES}/${course.id}`, {
        method: "PATCH",
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
    } catch (e2) {
      console.error("Assistentni biriktirishda xato", e2);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .as-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:110;
               display:flex; align-items:center; justify-content:center; padding:24px; }
      .as-md { background:#fff; border-radius:14px; width:100%; max-width:640px; padding:22px 26px 26px;
               box-shadow:0 24px 60px rgba(2,6,23,.28); }
      .as-md.sm { max-width:400px; padding:36px 28px 32px; text-align:center; }

      .as-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .as-title { font-size:21px; font-weight:700; color:#0F172A; }
      .as-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .as-x:hover { background:#F1F5F9; }
      .as-x svg { width:22px; height:22px; }

      .as-label { font-size:14px; font-weight:600; color:#0F172A; margin-bottom:8px; }
      .as-wrap { position:relative; display:flex; align-items:center; border:1px solid #CBD5E1;
                 border-radius:8px; background:#fff; }
      .as-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .as-wrap.err { border-color:#EF4444; }
      .as-wrap::after { content:""; position:absolute; right:15px; top:50%; width:9px; height:9px;
                        border-right:1.7px solid #64748B; border-bottom:1.7px solid #64748B;
                        transform:translateY(-70%) rotate(45deg); pointer-events:none; }
      .as-sel { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
                padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; cursor:pointer;
                appearance:none; }
      .as-err { margin-top:7px; font-size:13.5px; color:#EF4444; }
      .as-srv { margin:12px 0 0; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .as-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                 background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                 font-family:inherit; font-size:15px; font-weight:600; margin-top:18px; }
      .as-save:hover:not(:disabled) { background:#2F73E0; }
      .as-save:disabled { opacity:.65; cursor:not-allowed; }
      .as-save svg { width:19px; height:19px; }
      .as-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                 border-radius:50%; animation:as-spin .65s linear infinite; }
      @keyframes as-spin { to { transform:rotate(360deg); } }

      .as-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .as-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .as-dot svg { width:36px; height:36px; color:#fff; }
      .as-ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .as-ok-btn { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none;
                   border-radius:8px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .as-ok-btn:hover { background:#2F73E0; }
    `}</style>
  );

  if (done) {
    const finish = () => {
      onSaved();
      onClose();
    };
    return (
      <div className="as-ov" onClick={finish}>
        {styles}
        <div className="as-md sm" onClick={(e) => e.stopPropagation()}>
          <div className="as-ring">
            <div className="as-dot">
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
          <div className="as-ok-title">Muvaffaqiyatli o&apos;zgartirildi</div>
          <button className="as-ok-btn" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="as-ov" onClick={onClose}>
      {styles}
      <div className="as-md" onClick={(e) => e.stopPropagation()}>
        <div className="as-head">
          <div className="as-title">Assistent biriktirish</div>
          <button className="as-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="as-label">Assistentni tanlang</div>
          <div className={`as-wrap${err ? " err" : ""}`}>
            <select
              className="as-sel"
              value={assistantId}
              onChange={(e) => {
                setAssistantId(e.target.value);
                setErr("");
              }}
            >
              <option value="">Tanlash</option>
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {err && <p className="as-err">{err}</p>}
          {serverErr && <p className="as-srv">{serverErr}</p>}

          <button className="as-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="as-spin" />
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
