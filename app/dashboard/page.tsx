"use client";

import DashboardShell from "../components/DashboardShell";

const METRICS = [
  { label: "Jami Administratorlar", value: 3 },
  { label: "Jami Mentorlar", value: 12 },
  { label: "Jami Assistentlar", value: 24 },
  { label: "Jami O'quvchilar", value: 400 },
  { label: "Jami Kurslar", value: 12 },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <style>{`
        .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:22px; }
        .page-title { font-size:22px; font-weight:700; color:#0F172A; }
        .crumb { display:flex; align-items:center; gap:8px; margin-top:7px; font-size:13px; color:#94A3B8; }

        .metrics { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; }
        .metric { background:#fff; border:1px solid #EEF1F5; border-radius:12px; padding:18px;
                  box-shadow:0 1px 3px rgba(16,24,40,.06); }
        .metric .value { font-size:22px; font-weight:700; color:#0F172A; }
        .metric .label { font-size:13px; color:#94A3B8; margin-top:8px; }

        @media (max-width:1200px) { .metrics { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:700px)  { .metrics { grid-template-columns:1fr; } }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Asosiy</div>
          <div className="crumb">Boshqaruv paneli</div>
        </div>
      </div>

      <section className="metrics">
        {METRICS.map((m) => (
          <div key={m.label} className="metric">
            <div className="value">{m.value}</div>
            <div className="label">{m.label}</div>
          </div>
        ))}
      </section>
    </DashboardShell>
  );
}
