"use client";

import { useEffect } from "react";

type Props = {
  /* o'chiriladigan yozuv nomi — sarlavha ostida ko'rsatiladi */
  name?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  name,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="cf-ov" onClick={loading ? undefined : onCancel}>
      <style>{`
        .cf-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:120;
                 display:flex; align-items:center; justify-content:center; padding:24px; }
        .cf-md { background:#fff; border-radius:16px; width:100%; max-width:400px; padding:34px 30px 30px;
                 text-align:center; box-shadow:0 24px 60px rgba(2,6,23,.28); }
        .cf-ring { width:96px; height:96px; border-radius:50%; background:#FDECEC; margin:0 auto 24px;
                   display:flex; align-items:center; justify-content:center; }
        .cf-dot { width:70px; height:70px; border-radius:50%; background:#DC4A45; color:#fff;
                  display:flex; align-items:center; justify-content:center;
                  font-size:34px; font-weight:700; line-height:1; font-family:inherit; }
        .cf-title { font-size:17px; font-weight:700; color:#0F172A; line-height:1.5; }
        .cf-name { font-size:14px; color:#64748B; margin-top:8px; word-break:break-word; }
        .cf-btns { display:flex; align-items:center; justify-content:center; gap:12px; margin-top:26px; }
        .cf-btn { height:44px; padding:0 24px; border-radius:8px; font-family:inherit; font-size:15px;
                  font-weight:600; cursor:pointer; display:inline-flex; align-items:center;
                  justify-content:center; gap:8px; min-width:120px; }
        .cf-cancel { background:#fff; color:#0F172A; border:1px solid #E2E8F0; }
        .cf-cancel:hover:not(:disabled) { background:#F8FAFC; }
        .cf-del { background:#3B82F6; color:#fff; border:none; }
        .cf-del:hover:not(:disabled) { background:#2F73E0; }
        .cf-btn:disabled { opacity:.65; cursor:not-allowed; }
        .cf-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff;
                   border-radius:50%; animation:cf-spin .65s linear infinite; }
        @keyframes cf-spin { to { transform:rotate(360deg); } }
      `}</style>

      <div className="cf-md" onClick={(e) => e.stopPropagation()}>
        <div className="cf-ring">
          <div className="cf-dot">?</div>
        </div>

        <div className="cf-title">Siz rostdan ham o&apos;chirmoqchimisiz?</div>
        {name && <div className="cf-name">{name}</div>}

        <div className="cf-btns">
          <button
            type="button"
            className="cf-btn cf-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            className="cf-btn cf-del"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="cf-spin" /> : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}
