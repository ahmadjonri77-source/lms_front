"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import StudentShell from "../components/StudentShell";
import Avatar from "../components/Avatar";
import { fetchMyCourses, type MyCourse } from "../lib/student";
import { imageUrl } from "../lib/landing";

type LoadResult =
  | { kind: "ok"; courses: MyCourse[] }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

async function load(token: string): Promise<LoadResult> {
  try {
    const courses = await fetchMyCourses(token);
    return { kind: "ok", courses };
  } catch (e) {
    if (e instanceof Error && e.message === "Token yaroqsiz") {
      return { kind: "unauthorized" };
    }
    return {
      kind: "error",
      message: "Kurslarni yuklab bo'lmadi",
    };
  }
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    return load(token)
      .then((r) => {
        if (r.kind === "unauthorized") {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        if (r.kind === "error") {
          setCourses([]);
          setError(r.message);
          return;
        }
        setCourses(r.courses);
        setError("");
      })
      .catch((e: unknown) => {
        console.error("Kurslarni yuklashda xato", e);
        setError("Server bilan ulanishda xato yuz berdi");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    run();
  }, [run]);

  const handleCourseClick = (courseId: number) => {
    router.push(`/student/courses/${courseId}`);
  };

  return (
    <StudentShell>
      <style>{`
        .page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
        }
        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .crumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 14px;
          color: #64748b;
        }
        .crumb .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #94a3b8;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .course-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
        }
        .course-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(16, 24, 40, 0.1);
          transform: translateY(-2px);
        }

        .course-banner {
          position: relative;
          width: 100%;
          height: 180px;
          background: #f1f5f9;
          overflow: hidden;
        }
        .course-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .course-tag {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(34, 197, 94, 0.9);
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .course-content {
          padding: 18px;
        }

        .course-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .course-mentor {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .mentor-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .mentor-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }
        .mentor-label {
          font-size: 12px;
          color: #94a3b8;
        }

        .course-button {
          width: 100%;
          padding: 10px 16px;
          background: #3b82f6;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.3s ease;
        }
        .course-button:hover {
          background: #2f73e0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }
        .empty-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          color: #cbd5e1;
        }
        .empty-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .empty-text {
          font-size: 14px;
          color: #64748b;
          max-width: 400px;
        }

        .error-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 16px;
          color: #b91c1c;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .loading-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .loading-card-inner {
          height: 180px;
          background: #e2e8f0;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          .courses-grid {
            grid-template-columns: 1fr;
          }
          .page-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="page-head">
        <div>
          <div className="page-title">Mening kurslarim</div>
          <div className="crumb">
            <span>Dashboard</span>
            <i className="dot" />
            <span>Mening kurslarim</span>
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="loading-card">
              <div className="loading-card-inner" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5" />
            <path d="M3 9h18" strokeWidth="1.5" />
            <rect x="8" y="13" width="2" height="4" fill="currentColor" />
            <rect x="14" y="13" width="2" height="4" fill="currentColor" />
          </svg>
          <div className="empty-title">Hali kurslar yo&apos;q</div>
          <div className="empty-text">
            Siz hali hech qanday kursga yozilmagansiz. Landing sahifasiga o&apos;tib kurslar bilan tanishing
          </div>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(({ course, mentor }) => (
            <div
              key={course.id}
              className="course-card"
              onClick={() => handleCourseClick(course.id)}
            >
              <div className="course-banner">
                <Image
                  src={imageUrl(course.banner)}
                  alt={course.name}
                  width={300}
                  height={180}
                  quality={75}
                />
                {course.categories?.name && (
                  <div className="course-tag">{course.categories.name}</div>
                )}
              </div>

              <div className="course-content">
                <div className="course-title">{course.name}</div>

                <div className="course-mentor">
                  <Avatar file={mentor?.file ?? null} name={mentor?.full_name ?? "?"} size={32} />
                  <div className="mentor-info">
                    <div className="mentor-name">{mentor?.full_name ?? "Mentor"}</div>
                    <div className="mentor-label">Mentor</div>
                  </div>
                </div>

                <button className="course-button">Ko&apos;rishni boshlash</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
