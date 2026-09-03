"use client";

import { useEffect, useState } from "react";
import {
  API_LESSONS,
  errorMessage,
  formatSize,
  isAuthError,
  sendForm,
} from "../lib/api";

export type Lesson = {
  id: number;
  name: string;
  sectionId: number;
  description: string;
  file: string | null;
  create_at: string;
  update_at: string;
};

export type SectionOption = { id: number; name: string };

type Props = {
  /* null bo'lsa — yangi dars qo'shiladi */
  lesson: Lesson | null;
  sections: SectionOption[];
  /* sahifa bo'lim ichidan ochilgan bo'lsa — bo'lim tayyor keladi */
  presetSectionId?: number | null;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

/* backend xabarlari inglizcha keladi */
function uzMessage(raw: string) {
  if (/already exist/i.test(raw))
    return "Bu nomli dars allaqachon mavjud — dars nomini o'zgartiring";
  if (/section not found/i.test(raw)) return "Bo'lim topilmadi";
  return raw;
}

export default function LessonModal({
  lesson,
  sections,
  presetSectionId,
  onClose,
  onSaved,
  onUnauthorized,
}: Props) {
  const isEdit = Boolean(lesson);
  const fixedSectionId = lesson?.sectionId ?? presetSectionId ?? null;

  const [sectionId, setSectionId] = useState(
    fixedSectionId ? String(fixedSectionId) : "",
  );
  const [name, setName] = useState(lesson?.name ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [video, setVideo] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [errors, setErrors] = useState({ sectionId: "", name: "", description: "", file: "" });
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

  const pickVideo = (f: File | null) => {
    if (f && !f.type.startsWith("video/")) {
      setErrors((p) => ({ ...p, file: "Faqat video fayl (.mp4 yoki .MOV)" }));
      return;
    }
    setVideo(f);
    setProgress(0);
    setErrors((p) => ({ ...p, file: "" }));
  };

  const validate = () => {
    const next = { sectionId: "", name: "", description: "", file: "" };

    if (!sectionId) next.sectionId = "Bo'lim tanlanmadi";
    if (name.trim().length < 3) next.name = "Dars nomi kamida 3 ta belgidan iborat bo'lsin";
    if (!description.trim()) next.description = "To'liq kiritilmadi";
    // POST'da backend video faylni majburiy talab qiladi
    if (!isEdit && !video) next.file = "Video fayl tanlanmadi";

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
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("sectionId", sectionId);
      if (video) fd.append("file", video);

      const res = await sendForm(
        isEdit ? `${API_LESSONS}/${lesson!.id}` : API_LESSONS,
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
      console.error("Darsni saqlashda xato", err);
      setProgress(0);
      setServerErr(
        err instanceof Error ? err.message : "Server bilan ulanishda xato yuz berdi",
      );
    } finally {
      setSaving(false);
    }
  };

  const sectionName =
    sections.find((s) => s.id === fixedSectionId)?.name ?? "";

  const styles = (
    <style>{`
      .ls-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:110;
               display:flex; align-items:center; justify-content:center; padding:24px; }
      .ls-md { background:#fff; border-radius:14px; width:100%; max-width:560px; padding:22px 26px 26px;
               box-shadow:0 24px 60px rgba(2,6,23,.28); max-height:92vh; overflow-y:auto; }
      .ls-md.sm { max-width:400px; padding:36px 28px 32px; text-align:center; }

      .ls-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                 padding-bottom:14px; border-bottom:1px solid #E2E8F0; margin-bottom:18px; }
      .ls-title { font-size:21px; font-weight:700; color:#0F172A; }
      .ls-x { background:transparent; border:none; padding:4px; border-radius:6px; cursor:pointer;
              color:#0F172A; display:inline-flex; }
      .ls-x:hover:not(:disabled) { background:#F1F5F9; }
      .ls-x:disabled { opacity:.4; cursor:not-allowed; }
      .ls-x svg { width:22px; height:22px; }

      .ls-fld { margin-bottom:16px; }
      .ls-label { font-size:14px; font-weight:600; color:#0F172A; margin-bottom:8px; }
      .ls-wrap { display:flex; align-items:center; border:1px solid #CBD5E1; border-radius:8px; background:#fff; }
      .ls-wrap:focus-within { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .ls-wrap.err { border-color:#EF4444; }
      .ls-wrap.off { background:#F1F5F9; }
      .ls-wrap.caret { position:relative; }
      .ls-wrap.caret::after { content:""; position:absolute; right:15px; top:50%; width:9px; height:9px;
                              border-right:1.7px solid #64748B; border-bottom:1.7px solid #64748B;
                              transform:translateY(-70%) rotate(45deg); pointer-events:none; }
      .ls-ipt { flex:1; height:46px; min-width:0; border:none; outline:none; background:transparent;
                padding:0 14px; font-family:inherit; font-size:15px; color:#0F172A; }
      .ls-ipt:disabled { color:#64748B; -webkit-text-fill-color:#64748B; }
      .ls-ipt::placeholder { color:#94A3B8; }
      select.ls-ipt { cursor:pointer; appearance:none; }
      .ls-err { margin-top:7px; font-size:13.5px; color:#EF4444; }

      .ls-up { display:block; border:1px solid #E2E8F0; border-radius:12px; background:#fff;
               padding:18px 14px; text-align:center; cursor:pointer; }
      .ls-up:hover, .ls-up.drag { border-color:#93C5FD; background:#F8FBFF; }
      .ls-up.err { border-color:#EF4444; }
      .ls-up-ico { width:44px; height:44px; border-radius:50%; background:#F1F5F9; color:#475569;
                   margin:0 auto 12px; display:flex; align-items:center; justify-content:center; }
      .ls-up-ico svg { width:22px; height:22px; }
      .ls-up-txt { font-size:14px; color:#475569; }
      .ls-up-txt b { color:#3B82F6; font-weight:600; }
      .ls-up-hint { margin-top:4px; font-size:12.5px; color:#94A3B8; }

      .ls-file { display:flex; align-items:flex-start; gap:12px; margin-top:12px; padding:12px 14px;
                 border:1px solid #E2E8F0; border-radius:10px; }
      .ls-file-ico { width:34px; height:34px; border-radius:8px; background:#3B82F6; color:#fff;
                     display:flex; align-items:center; justify-content:center; flex:none; }
      .ls-file-ico svg { width:18px; height:18px; }
      .ls-file-body { flex:1; min-width:0; }
      .ls-file-name { font-size:14px; font-weight:600; color:#0F172A; overflow:hidden;
                      text-overflow:ellipsis; white-space:nowrap; }
      .ls-file-size { font-size:12.5px; color:#64748B; margin-bottom:8px; }
      .ls-bar-row { display:flex; align-items:center; gap:10px; }
      .ls-bar { flex:1; height:7px; border-radius:4px; background:#E2E8F0; overflow:hidden; }
      .ls-bar i { display:block; height:100%; background:#3B82F6; transition:width .2s; }
      .ls-pct { font-size:12.5px; color:#334155; min-width:34px; text-align:right; }
      .ls-file-x { background:transparent; border:none; padding:2px; cursor:pointer; color:#94A3B8;
                   display:inline-flex; flex:none; }
      .ls-file-x:hover { color:#EF4444; }
      .ls-file-x svg { width:18px; height:18px; }
      .ls-file-ok { width:20px; height:20px; border-radius:5px; background:#3B82F6; color:#fff; flex:none;
                    display:flex; align-items:center; justify-content:center; }
      .ls-file-ok svg { width:13px; height:13px; }

      .ls-srv { margin:2px 0 14px; font-size:13.5px; color:#B91C1C; background:#FEF2F2;
                border:1px solid #FECACA; border-radius:8px; padding:10px 12px; }

      .ls-save { display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 26px;
                 background:#3B82F6; color:#fff; border:none; border-radius:8px; cursor:pointer;
                 font-family:inherit; font-size:15px; font-weight:600; margin-top:6px; }
      .ls-save:hover:not(:disabled) { background:#2F73E0; }
      .ls-save:disabled { opacity:.65; cursor:not-allowed; }
      .ls-save svg { width:19px; height:19px; }
      .ls-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                 border-radius:50%; animation:ls-spin .65s linear infinite; }
      @keyframes ls-spin { to { transform:rotate(360deg); } }

      .ls-ring { width:104px; height:104px; border-radius:50%; background:#EFF6FF; margin:0 auto 22px;
                 display:flex; align-items:center; justify-content:center; }
      .ls-dot { width:72px; height:72px; border-radius:50%; background:#3B82F6;
                display:flex; align-items:center; justify-content:center; }
      .ls-dot svg { width:36px; height:36px; color:#fff; }
      .ls-ok-title { font-size:19px; font-weight:700; color:#0F172A; margin-bottom:22px; }
      .ls-ok-btn { height:44px; padding:0 30px; background:#3B82F6; color:#fff; border:none;
                   border-radius:8px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; }
      .ls-ok-btn:hover { background:#2F73E0; }
    `}</style>
  );

  if (done) {
    const finish = () => {
      onSaved();
      onClose();
    };
    return (
      <div className="ls-ov" onClick={finish}>
        {styles}
        <div className="ls-md sm" onClick={(e) => e.stopPropagation()}>
          <div className="ls-ring">
            <div className="ls-dot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="ls-ok-title">
            {isEdit ? "Muvaffaqiyatli o'zgartirildi" : "Dars qo'shildi"}
          </div>
          <button className="ls-ok-btn" onClick={finish}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ls-ov" onClick={saving ? undefined : onClose}>
      {styles}
      <div className="ls-md" onClick={(e) => e.stopPropagation()}>
        <div className="ls-head">
          <div className="ls-title">{isEdit ? "Tahrirlash" : "Dars qo'shish"}</div>
          <button
            className="ls-x"
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
          <div className="ls-fld">
            <div className="ls-label">Bo&apos;lim nomi</div>

            {/* bo'lim ma'lum bo'lsa o'zgartirilmaydi, aks holda ro'yxatdan tanlanadi */}
            {fixedSectionId ? (
              <div className="ls-wrap off">
                <input
                  className="ls-ipt"
                  value={sectionName || `#${fixedSectionId}`}
                  disabled
                />
              </div>
            ) : (
              <div className={`ls-wrap caret${errors.sectionId ? " err" : ""}`}>
                <select
                  className="ls-ipt"
                  value={sectionId}
                  onChange={(e) => {
                    setSectionId(e.target.value);
                    setErrors((p) => ({ ...p, sectionId: "" }));
                  }}
                >
                  <option value="">Bo&apos;limni tanlang</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {errors.sectionId && <p className="ls-err">{errors.sectionId}</p>}
          </div>

          <div className="ls-fld">
            <div className="ls-label">Dars nomi</div>
            <div className={`ls-wrap${errors.name ? " err" : ""}`}>
              <input
                className="ls-ipt"
                value={name}
                placeholder="Kiriting"
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((p) => ({ ...p, name: "" }));
                }}
              />
            </div>
            {errors.name && <p className="ls-err">{errors.name}</p>}
          </div>

          <div className="ls-fld">
            <div className="ls-label">Dars haqida</div>
            <div className={`ls-wrap${errors.description ? " err" : ""}`}>
              <input
                className="ls-ipt"
                value={description}
                placeholder="Kiriting"
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((p) => ({ ...p, description: "" }));
                }}
              />
            </div>
            {errors.description && <p className="ls-err">{errors.description}</p>}
          </div>

          <div className="ls-fld">
            <div className="ls-label">Video fayl</div>
            <label
              className={`ls-up${dragOver ? " drag" : ""}${errors.file ? " err" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickVideo(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <div className="ls-up-ico">
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
              <div className="ls-up-txt">
                <b>Bu yerga bosing</b> yoki faylni suring
              </div>
              <div className="ls-up-hint">.mp4 yoki .MOV</div>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/*"
                hidden
                onChange={(e) => pickVideo(e.target.files?.[0] ?? null)}
              />
            </label>
            {errors.file && <p className="ls-err">{errors.file}</p>}

            {video && (
              <div className="ls-file">
                <div className="ls-file-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="5" width="18" height="14" rx="3" strokeWidth="1.7" />
                    <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" fill="currentColor" stroke="none" />
                  </svg>
                </div>

                <div className="ls-file-body">
                  <div className="ls-file-name">{video.name}</div>
                  <div className="ls-file-size">{formatSize(video.size)}</div>
                  <div className="ls-bar-row">
                    <div className="ls-bar">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span className="ls-pct">{progress}%</span>
                  </div>
                </div>

                {progress === 100 ? (
                  <span className="ls-file-ok">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="ls-file-x"
                    aria-label="Faylni olib tashlash"
                    disabled={saving}
                    onClick={() => pickVideo(null)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {isEdit && !video && lesson?.file && (
              <p className="ls-up-hint" style={{ marginTop: 10 }}>
                Joriy video: {lesson.file} — yangisi tanlanmasa o&apos;zgarmaydi
              </p>
            )}
          </div>

          {serverErr && <p className="ls-srv">{serverErr}</p>}

          <button className="ls-save" type="submit" disabled={saving}>
            {saving ? (
              <span className="ls-spin" />
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
