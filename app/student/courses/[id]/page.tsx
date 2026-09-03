"use client";

import { useParams } from "next/navigation";
import StudentShell from "../../../components/StudentShell";

export default function StudentCourseWatchPage() {
  const params = useParams<{ id: string }>();

  return (
    <StudentShell>
      <style>{`
        .soon-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .soon-icon {
          width: 56px;
          height: 56px;
          margin-bottom: 16px;
          color: #94a3b8;
        }
        .soon-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .soon-text {
          font-size: 14px;
          color: #64748b;
        }
      `}</style>

      <div className="soon-box">
        <svg className="soon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
          <path d="M12 7v5l3 3" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="soon-title">Bu bo&apos;lim tez orada tayyor bo&apos;ladi</div>
        <div className="soon-text">Kurs #{params.id} darslarini ko&apos;rish sahifasi ustida ishlanmoqda</div>
      </div>
    </StudentShell>
  );
}
