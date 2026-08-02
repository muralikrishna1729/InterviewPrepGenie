import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, CalendarDays, AlertTriangle, CheckCircle2, PlayCircle, Clock } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { interviewService } from '../../services/interview';

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface-raised)] rounded-2xl p-6 border border-[var(--border)] animate-pulse">
      <div className="h-4 w-1/2 rounded bg-[var(--border)] mb-3" />
      <div className="h-5 w-3/4 rounded bg-[var(--border)] mb-4" />
      <div className="h-4 w-1/4 rounded bg-[var(--border)]" />
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 bg-teal-500/15 text-teal-400 border border-teal-500/30">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Completed
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 bg-indigo-600 text-white shadow-[0_0_12px_0_var(--primary)]">
        <PlayCircle className="w-3.5 h-3.5" />
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)]">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    interviewService.list()
      .then((data) => {
        if (!cancelled) setInterviews(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load interviews.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Dashboard</h1>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
        </div>
      )}

      {/* Error state — never shows fake data on error */}
      {!loading && error && (
        <Card className="border border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Could not load interviews</div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
              <Button
                variant="secondary"
                className="mt-3 px-4 py-2 text-sm"
                onClick={() => { setLoading(true); setError(null); interviewService.list().then(setInterviews).catch((e) => setError(e?.message || 'Error')).finally(() => setLoading(false)); }}
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && interviews.length === 0 && (
        <Card className="text-center py-14">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-900/30 text-indigo-400 grid place-items-center">
            <Mic className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">No interviews yet</h2>
          <p className="mt-1 text-[var(--text-secondary)]">Start your first practice session to see your progress here.</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/practice')} className="px-6 py-3">
              Start Your First Interview
            </Button>
          </div>
        </Card>
      )}

      {/* Populated grid — real data only */}
      {!loading && !error && interviews.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((it) => {
            const score = it.feedback?.score ?? null;
            const isInProgress = it.status === 'in_progress';
            return (
              <Card
                key={it.id}
                className={`h-full flex flex-col border transition ${
                  isInProgress
                    ? 'border-indigo-500/60 ring-2 ring-indigo-500/20'
                    : 'border-[var(--border)] hover:border-indigo-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-secondary)] inline-flex items-center gap-1">
                      <CalendarDays className="w-4 h-4 shrink-0" />
                      {new Date(it.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <h3 className="mt-1 font-semibold text-[var(--text-primary)] truncate" title={it.role}>{it.role}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize truncate">{it.interview_type} · {it.experience_level}</p>
                  </div>
                  {score !== null && (
                    <span className="text-xs font-semibold rounded-full bg-indigo-900/40 text-indigo-300 px-2 py-1 shrink-0">
                      Score {score}
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between mt-auto">
                  <StatusBadge status={it.status} />
                  <button
                    onClick={() => navigate(`/practice/session/${it.id}/results`)}
                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
                  >
                    View Feedback →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
