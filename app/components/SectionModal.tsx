"use client";

import { useEffect, useState } from "react";
import {
  API_SECTIONS,
  errorMessage,
  isAuthError,
  readBody,
  type ApiError,
} from "../lib/api";

export type Section = {
  id: number;
  name: string;
  courseId: number;
  create_at: string;
  update_at: string;
};

export type CourseOption = { id: number; name: string };

type Props = {
  /* null bo'lsa — yangi bo'lim qo'shiladi */
  section: Section | null;
  courses: CourseOption[];
  /* kurs ichidan ochilganda kurs tayyor keladi */
  presetCourseId?: number | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

const NAME_MIN = 3;

function uzMessage(raw: string) {
  if (/already exist/i.test(raw)) return "Bu nomli bo'lim allaqachon mavjud";
  if (/course not found/i.test(raw)) return "Kurs topilmadi";
  return raw;
}

export default function SectionModal({
  section,
  courses,
  presetCourseId,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const isEdit = Boolean(section);

  const [courseId, setCourseId] = useState(
    String(section?.courseId ?? presetCourseId ?? ""),
  );
  const [name, setName] = useState(section?.name ?? "");
  const [errors, setErrors] = useState({ courseId: "", name: "" });
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

  const validate = () => {
    const next = { courseId: "", name: "" };
    if (!courseId) next.courseId = "Kurs tanlanmadi";
    if (name.trim().length < NAME_MIN)
      next.name = `Bo'lim nomi kamida ${NAME_MIN} ta belgidan iborat bo'lsin`;
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
      const res = await fetch(
        isEdit ? `${API_SECTIONS}/${section!.id}` : API_SECTIONS,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: name.trim(), courseId: Number(courseId) }),
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
    } catch (err) {
      console.error("Bo'limni saqlashda xato", err);
      setServerErr("Server bilan ulanishda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .sc-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:110;
               display:flex; align-items:center; justify-content:center; padding:24px; }
      .sc-md { background:#fff; border-radius:14px; width:100%; max-width:520px; padding:22px 26px 26px;
               box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
      .sc-md.sm { max-width:400px; padding:36px 28px 32px; text-align:center; }

      .sc-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .sc-title { font-size:21px; font-weight:700; color:#0F172A; }
      .sc-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .sc-x:hover { background:#F1F5F9; }
      .sc-x svg { width:22px; height:22px; }

      .sc-fld { margin-bottom:16px; }
      .sc-label { font-size:14px; font-weight:600; color:#0F172A; margin-bottom:8px; }
      .sc-wrap { position:relative; display:flex; align-items:center; border:1px solid #CBD5E1;
                 border-radius:8px; background:#fff; }
      .sc-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .sc-wrap.err { border-color:#EF4444; }
      .sc-wrap.caret::after { content:""; position:absolute; right:15px; top:50%; width:9px; height:9px;
                              border-right:1.7px solid #64748B; border-bottom:1.7px solid #64748B;
                              transform:translateY(-70%) rotate(45deg); pointer-events:none; }
      .sc-ipt { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
                padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .sc-ipt::placeholder { color:#94A3B8; }
      select.sc-ipt { cursor:pointer; appearance:none; padding-right:36px; }
      .sc-err { margin-top:7px; font-size:13.5px; color:#EF4444; }
      .sc-srv { margin:2px 0 14px; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .sc-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                 background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                 font-family:inherit; font-size:15px; font-weight:600; margin-top:6px; }
      .sc-save:hover:not(:disabled) { background:#2F73E0; }
      .sc-save:disabled { opacity:.65; cursor:not-allowed; }
      .sc-save svg { width:19px; height:19px; }
      .sc-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                 border-radius:50%; animation:sc-spin .65s linear infinite; }
      @keyframes sc-spin { to { transform:rotate(360deg); } }

      .sc-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .sc-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .sc-dot svg { width:36px; height:36px; color:#fff; }
      .sc-ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .sc-ok-btn { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none;
                   border-radius:8px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .sc-ok-btn:hover { background:#2F73E0; }
    `}</style>
  );

  if (done) {
    const finish = () => {
      onSaved();
      onClose();
    };
    return (
      <div className="sc-ov" onClick={finish}>
        {styles}
        <div className="sc-md sm" onClick={(e) => e.stopPropagation()}>
          <div className="sc-ring">
            <div className="sc-dot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="sc-ok-title">
            {isEdit ? "Muvaffaqiyatli o'zgartirildi" : "Bo'lim qo'shildi"}
          </div>
          <button className="sc-ok-btn" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-ov" onClick={onClose}>
      {styles}
      <div className="sc-md" onClick={(e) => e.stopPropagation()}>
        <div className="sc-head">
          <div className="sc-title">{isEdit ? "Tahrirlash" : "Bo'lim qo'shish"}</div>
          <button className="sc-x" aria-label="Yopish" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="sc-fld">
            <div className="sc-label">Biriktirilgan kurs</div>
            <div className={`sc-wrap caret${errors.courseId ? " err" : ""}`}>
              <select
                className="sc-ipt"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setErrors((p) => ({ ...p, courseId: "" }));
                }}
              >
                <option value="">Kursni tanlang</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.courseId && <p className="sc-err">{errors.courseId}</p>}
          </div>

          <div className="sc-fld">
            <div className="sc-label">Bo&apos;lim nomi</div>
            <div className={`sc-wrap${errors.name ? " err" : ""}`}>
              <input
                className="sc-ipt"
                value={name}
                autoFocus
                placeholder="Kiriting"
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((p) => ({ ...p, name: "" }));
                }}
              />
            </div>
            {errors.name && <p className="sc-err">{errors.name}</p>}
          </div>

          {serverErr && <p className="sc-srv">{serverErr}</p>}

          <button className="sc-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="sc-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            Saqlash
          </button>
        </form>
      </div>
    </div>
  );
}
