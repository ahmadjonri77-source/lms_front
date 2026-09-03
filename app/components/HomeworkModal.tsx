"use client";

import { useEffect, useState } from "react";
import {
  API_HOMEWORKS,
  errorMessage,
  formatSize,
  isAuthError,
  sendForm,
} from "../lib/api";

export type Homework = {
  id: number;
  lessonId: number;
  description: string;
  file: string | null;
  create_at: string;
  update_at: string;
};

export type LessonOption = { id: number; name: string };

type Props = {
  /* null bo'lsa — yangi vazifa qo'shiladi */
  homework: Homework | null;
  lessons: LessonOption[];
  /* dars sahifasidan ochilganda dars tayyor keladi */
  presetLessonId?: number | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

function uzMessage(raw: string) {
  if (/lesson not found/i.test(raw)) return "Dars topilmadi";
  return raw;
}

export default function HomeworkModal({
  homework,
  lessons,
  presetLessonId,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const isEdit = Boolean(homework);

  const [lessonId, setLessonId] = useState(
    String(homework?.lessonId ?? presetLessonId ?? ""),
  );
  const [description, setDescription] = useState(homework?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [errors, setErrors] = useState({ lessonId: "", description: "", file: "" });
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // yuklash ketayotganda yopish so'rovni uzib yuboradi
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  /* fayl yuklanayotganda sahifa yangilansa so'rov uziladi — ogohlantiramiz */
  useEffect(() => {
    if (!saving) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saving]);

  /* backend faylni mime turiga qarab saqlaydi: faqat rasm va video qo'llanadi */
  const pickFile = (f: File | null) => {
    if (f && !f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setErrors((p) => ({
        ...p,
        file: "Backend faqat rasm yoki video faylni qabul qiladi",
      }));
      return;
    }
    setFile(f);
    setProgress(0);
    setErrors((p) => ({ ...p, file: "" }));
  };

  const validate = () => {
    const next = { lessonId: "", description: "", file: "" };
    if (!lessonId) next.lessonId = "Dars tanlanmadi";
    if (!description.trim()) next.description = "To'liq kiritilmadi";
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
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("lessonId", lessonId);
      fd.append("description", description.trim());
      if (file) fd.append("file", file);

      const res = await sendForm(
        isEdit ? `${API_HOMEWORKS}/${homework!.id}` : API_HOMEWORKS,
        isEdit ? "PATCH" : "POST",
        fd,
        token,
        (percent) => setProgress(percent),
      );

      if (!res.ok) {
        if (isAuthError(res, res.body)) {
          localStorage.removeItem("token");
          onUnauthorized();
          return;
        }
        setProgress(0);
        setServerErr(uzMessage(errorMessage(res.body, "Saqlab bo'lmadi")));
        return;
      }

      setDone(true);
    } catch (err) {
      console.error("Vazifani saqlashda xato", err);
      setProgress(0);
      setServerErr(
        err instanceof Error ? err.message : "Server bilan ulanishda xato yuz berdi",
      );
    } finally {
      setSaving(false);
    }
  };

  const styles = (
    <style>{`
      .hw-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:110;
               display:flex; align-items:center; justify-content:center; padding:24px; }
      .hw-md { background:#fff; border-radius:14px; width:100%; max-width:520px; padding:22px 26px 26px;
               box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
      .hw-md.sm { max-width:400px; padding:36px 28px 32px; text-align:center; }

      .hw-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .hw-title { font-size:21px; font-weight:700; color:#0F172A; }
      .hw-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .hw-x:hover:not(:disabled) { background:#F1F5F9; }
      .hw-x:disabled { opacity:.4; cursor:not-allowed; }
      .hw-x svg { width:22px; height:22px; }

      .hw-fld { margin-bottom:16px; }
      .hw-label { font-size:14px; font-weight:600; color:#0F172A; margin-bottom:8px; }
      .hw-wrap { position:relative; display:flex; align-items:center; border:1px solid #CBD5E1;
                 border-radius:8px; background:#fff; }
      .hw-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .hw-wrap.err { border-color:#EF4444; }
      .hw-wrap.caret::after { content:""; position:absolute; right:15px; top:50%; width:9px; height:9px;
                              border-right:1.7px solid #64748B; border-bottom:1.7px solid #64748B;
                              transform:translateY(-70%) rotate(45deg); pointer-events:none; }
      .hw-ipt { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
                padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .hw-ipt::placeholder { color:#94A3B8; }
      select.hw-ipt { cursor:pointer; appearance:none; padding-right:36px; }
      .hw-err { margin-top:7px; font-size:13.5px; color:#EF4444; }

      .hw-up { display:block; border:1px solid #E2E8F0; border-radius:12px; background:#fff;
               padding:18px 14px; text-align:center; cursor:pointer; }
      .hw-up:hover, .hw-up.drag { border-color:#93C5FD; background:#F8FBFF; }
      .hw-up.err { border-color:#EF4444; }
      .hw-up-ico { width:44px; height:44px; border-radius:50%; background:#F1F5F9; color:#475569;
                   margin:0 auto 12px; display:flex; align-items:center; justify-content:center; }
      .hw-up-ico svg { width:22px; height:22px; }
      .hw-up-txt { font-size:14px; color:#475569; }
      .hw-up-txt b { color:#3B82F6; font-weight:600; }
      .hw-up-hint { margin-top:4px; font-size:12.5px; color:#94A3B8; }

      .hw-file { display:flex; align-items:flex-start; gap:12px; margin-top:12px; padding:12px 14px;
                 border:1px solid #E2E8F0; border-radius:10px; }
      .hw-file-ico { width:34px; height:34px; border-radius:8px; background:#3B82F6; color:#fff;
                     display:flex; align-items:center; justify-content:center; flex:none; }
      .hw-file-ico svg { width:18px; height:18px; }
      .hw-file-body { flex:1; min-width:0; }
      .hw-file-name { font-size:14px; font-weight:600; color:#0F172A; overflow:hidden;
                      text-overflow:ellipsis; white-space:nowrap; }
      .hw-file-size { font-size:12.5px; color:#64748B; margin-bottom:8px; }
      .hw-bar-row { display:flex; align-items:center; gap:10px; }
      .hw-bar { flex:1; height:7px; border-radius:4px; background:#E2E8F0; overflow:hidden; }
      .hw-bar i { display:block; height:100%; background:#3B82F6; transition:width .2s; }
      .hw-pct { font-size:12.5px; color:#334155; min-width:34px; text-align:right; }
      .hw-file-x { background:transparent; border:none; padding:2px; cursor:pointer; color:#94A3B8;
                   display:inline-flex; flex:none; }
      .hw-file-x:hover { color:#EF4444; }
      .hw-file-x svg { width:18px; height:18px; }
      .hw-file-ok { width:20px; height:20px; border-radius:5px; background:#3B82F6; color:#fff; flex:none;
                    display:flex; align-items:center; justify-content:center; }
      .hw-file-ok svg { width:13px; height:13px; }

      .hw-srv { margin:2px 0 14px; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .hw-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                 background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                 font-family:inherit; font-size:15px; font-weight:600; margin-top:6px; }
      .hw-save:hover:not(:disabled) { background:#2F73E0; }
      .hw-save:disabled { opacity:.65; cursor:not-allowed; }
      .hw-save svg { width:19px; height:19px; }
      .hw-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                 border-radius:50%; animation:hw-spin .65s linear infinite; }
      @keyframes hw-spin { to { transform:rotate(360deg); } }

      .hw-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .hw-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .hw-dot svg { width:36px; height:36px; color:#fff; }
      .hw-ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .hw-ok-btn { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none;
                   border-radius:8px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .hw-ok-btn:hover { background:#2F73E0; }
    `}</style>
  );

  if (done) {
    const finish = () => {
      onSaved();
      onClose();
    };
    return (
      <div className="hw-ov" onClick={finish}>
        {styles}
        <div className="hw-md sm" onClick={(e) => e.stopPropagation()}>
          <div className="hw-ring">
            <div className="hw-dot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="hw-ok-title">
            {isEdit ? "Muvaffaqiyatli o'zgartirildi" : "Vazifa qo'shildi"}
          </div>
          <button className="hw-ok-btn" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-ov" onClick={saving ? undefined : onClose}>
      {styles}
      <div className="hw-md" onClick={(e) => e.stopPropagation()}>
        <div className="hw-head">
          <div className="hw-title">{isEdit ? "Tahrirlash" : "Vazifa qo'shish"}</div>
          <button
            className="hw-x"
            aria-label="Yopish"
            disabled={saving}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="hw-fld">
            <div className="hw-label">Dars</div>
            <div className={`hw-wrap caret${errors.lessonId ? " err" : ""}`}>
              <select
                className="hw-ipt"
                value={lessonId}
                onChange={(e) => {
                  setLessonId(e.target.value);
                  setErrors((p) => ({ ...p, lessonId: "" }));
                }}
              >
                <option value="">Darsni tanlang</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.lessonId && <p className="hw-err">{errors.lessonId}</p>}
          </div>

          <div className="hw-fld">
            <div className="hw-label">Vazifa uchun izoh</div>
            <div className={`hw-wrap${errors.description ? " err" : ""}`}>
              <input
                className="hw-ipt"
                value={description}
                placeholder="Kiriting"
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((p) => ({ ...p, description: "" }));
                }}
              />
            </div>
            {errors.description && <p className="hw-err">{errors.description}</p>}
          </div>

          <div className="hw-fld">
            <div className="hw-label">Fayl biriktirish</div>
            <label
              className={`hw-up${dragOver ? " drag" : ""}${errors.file ? " err" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <div className="hw-up-ico">
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
              <div className="hw-up-txt">
                <b>Bu yerga bosing</b> yoki faylni suring
              </div>
              <div className="hw-up-hint">SVG, PNG, JPG, GIF yoki video</div>
              <input
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {errors.file && <p className="hw-err">{errors.file}</p>}

            {file && (
              <div className="hw-file">
                <div className="hw-file-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 3h8l4 4v14H6z" strokeWidth="1.7" strokeLinejoin="round" />
                    <path d="M14 3v4h4" strokeWidth="1.7" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="hw-file-body">
                  <div className="hw-file-name">{file.name}</div>
                  <div className="hw-file-size">{formatSize(file.size)}</div>
                  <div className="hw-bar-row">
                    <div className="hw-bar">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span className="hw-pct">{progress}%</span>
                  </div>
                </div>

                {progress === 100 ? (
                  <span className="hw-file-ok">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="hw-file-x"
                    aria-label="Faylni olib tashlash"
                    disabled={saving}
                    onClick={() => pickFile(null)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {isEdit && !file && homework?.file && (
              <p className="hw-up-hint" style={{ marginTop: 10 }}>
                Joriy fayl: {homework.file} — yangisi tanlanmasa o&apos;zgarmaydi
              </p>
            )}
          </div>

          {serverErr && <p className="hw-srv">{serverErr}</p>}

          <button className="hw-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="hw-spin" />
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
