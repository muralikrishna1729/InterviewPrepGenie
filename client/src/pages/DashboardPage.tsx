import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { interviewService } from "../services/interview";
import { Button } from "../components/Button";

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="mb-4 rounded-2xl border p-4 shadow animate-pulse"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="h-6 bg-gray-600 rounded w-1/4 mb-3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-yellow-500",
    in_progress: "bg-primary",
    completed: "bg-accent-mint",
  };
  const text = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-white text-sm font-medium ${colors[status] || "bg-gray-500"}`}
    >
      {text[status] || "Unknown"}
    </span>
  );
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<null | any[]>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    interviewService.list().then((data) => {
      if (mounted) setInterviews(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (interviews === null) {
    return <LoadingSkeleton />;
  }

  if (interviews.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <h2 className="text-3xl font-exponent mb-6">No interviews yet</h2>
        <p className="mb-6 text-[var(--text-secondary)]">
          You haven't started any interviews. Get started by creating a new interview!
        </p>
        <Button
          onClick={() => navigate("/practice/new")}
          className="bg-gradient-brand rounded-2xl px-6 py-3 text-white text-lg font-exponent shadow-lg hover:brightness-110 transition"
        >
          Start New Interview
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-exponent">Your Interviews</h1>
        <Button
          onClick={() => navigate("/practice/new")}
          className="bg-gradient-brand rounded-2xl px-6 py-3 text-white text-lg font-exponent shadow-lg hover:brightness-110 transition"
        >
          Start New Interview
        </Button>
      </div>

      {interviews.map((interview) => (
        <div
          key={interview.id}
          className="rounded-2xl border p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          style={{ background: "var(--bg-surface-raised)", borderColor: "var(--border)" }}
        >
          <div>
            <p className="text-[var(--text-secondary)]">
              {new Date(interview.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <h2 className="text-xl font-exponent font-semibold text-[var(--text-primary)]">
              {interview.interview_type}
            </h2>
            <p className="text-[var(--text-secondary)]">
              {interview.number_of_questions} Questions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <StatusBadge status={interview.status} />
            {interview.status === "completed" && (
              <button
                onClick={() => navigate(`/practice/session/${interview.id}/results`)}
                className="text-[var(--accent-mint)] font-semibold hover:underline"
              >
                View feedback
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
