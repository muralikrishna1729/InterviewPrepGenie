import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { Loader2, Brain, AlertTriangle } from 'lucide-react';
import { mcqService } from '../../services/mcq';
import { usePersistedState } from '../../hooks/usePersistedState';

const MIN_JD_LENGTH = 20;

const JOB_TYPES = [
  'Software Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'QA / Test Engineer',
  'Python Developer',
  'Java Developer',
  'GenAI / ML Engineer',
  'React Developer',
  'Node.js Developer',
  'Product Manager',
  'Business Analyst',
];

export default function McqPage() {
  const navigate = useNavigate();

  const [jobTitle, setJobTitle] = usePersistedState('mcq.jobTitle', '');
  const [jobDescription, setJobDescription] = usePersistedState('mcq.jobDescription', '');
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('form');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Poll the session until questions are ready
  useEffect(() => {
    if (phase !== 'generating' || !sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const session = await mcqService.getById(sessionId);
        if (session.status === 'ready' && session.questions?.length) {
          stopPolling();
          setQuestions(session.questions);
          setPhase('quiz');
        } else if (session.status === 'failed') {
          stopPolling();
          setPhase('form');
          setError('Question generation failed. Please try again.');
        }
      } catch {
        // transient — keep polling
      }
    }, 2000);
    return stopPolling;
  }, [phase, sessionId, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  // Poll the session after submit until the async Celery feedback arrives
  // (submit returns immediately with feedback=null; the worker fills it in).
  // Capped at ~60s so a hung worker can't poll forever.
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  useEffect(() => {
    if (phase !== 'results' || !sessionId || result?.feedback) return;
    setFeedbackLoading(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const session = await mcqService.getById(sessionId);
        if (session.feedback) {
          stopPolling();
          setResult((prev) => ({ ...prev, ...session }));
          setFeedbackLoading(false);
        } else if (attempts >= 30) {
          stopPolling();
          setFeedbackLoading(false);
        }
      } catch {
        // transient — keep polling
      }
    }, 2000);
    return stopPolling;
  }, [phase, sessionId, result?.feedback, stopPolling]);

  const handleGenerate = async () => {
    const jd = jobDescription.trim();
    if (jd.length < MIN_JD_LENGTH) {
      setError(`Please enter at least ${MIN_JD_LENGTH} characters of job description.`);
      return;
    }
    setError(null);
    setPhase('generating');
    try {
      const session = await mcqService.generate({
        job_title: jobTitle.trim() || undefined,
        job_description: jd,
      });
      setSessionId(session.id);
      // If already ready (rare), go straight to quiz
      if (session.status === 'ready' && session.questions?.length) {
        setQuestions(session.questions);
        setPhase('quiz');
      }
    } catch (err) {
      setPhase('form');
      setError(err?.response?.data?.detail || 'Failed to generate questions. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    if (questions.length > 0 && Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setError(null);
    setPhase('submitting');
    try {
      const res = await mcqService.submit(sessionId, answers);
      // feedback arrives async via Celery — poll once briefly
      setResult(res);
      setPhase('results');
    } catch (err) {
      setPhase('quiz');
      setError(err?.response?.data?.detail || 'Failed to submit. Please try again.');
    }
  };

  const handleReset = () => {
    stopPolling();
    setFeedbackLoading(false);
    setJobTitle(''); setJobDescription(''); setSessionId(null); setQuestions([]);
    setAnswers({}); setResult(null); setError(null); setPhase('form');
  };

  const answeredCount = Object.keys(answers).length;
  const score = result?.score ?? 0;

  const scoreColor = score >= 70 ? 'text-teal-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = score >= 70 ? 'bg-teal-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">MCQ Practice</h1>
      <p className="text-sm text-[var(--text-secondary)] -mt-4">
        AI-generated aptitude + job-specific questions from a job description, with feedback on your results.
      </p>

      {error && (
        <Card className="border border-red-500/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          </div>
        </Card>
      )}

      {/* ── FORM ── */}
      {phase === 'form' && (
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
                Job Type <span className="text-xs text-[var(--text-secondary)] opacity-70">(optional)</span>
              </label>
              <select
                value={isCustomJob ? 'custom' : jobTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') { setIsCustomJob(true); setJobTitle(''); }
                  else { setIsCustomJob(false); setJobTitle(val); }
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a job type…</option>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="custom">Other / Type manually…</option>
              </select>
              {isCustomJob && (
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Type your job type…"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
                Job Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                placeholder="Paste the job description here. We'll generate aptitude + job-specific MCQs."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-70">
                {jobDescription.trim().length} / {MIN_JD_LENGTH}+ characters required
              </p>
            </div>
            <Button onClick={handleGenerate} className="px-6 py-3">
              <Brain className="w-4 h-4" /> Generate 20 Questions
            </Button>
          </div>
        </Card>
      )}

      {/* ── GENERATING (polling) ── */}
      {phase === 'generating' && (
        <Card className="text-center py-14">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-[var(--text-primary)] font-medium">Generating your questions…</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">This usually takes a few seconds.</p>
        </Card>
      )}

      {/* ── QUIZ ── */}
      {(phase === 'quiz' || phase === 'submitting') && (
        <div className="space-y-5">
          {/* Progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Your Progress</span>
              <span className="text-sm font-bold text-teal-500">{answeredCount}/{questions.length}</span>
            </div>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${answers[i] >= 0 ? 'bg-teal-500' : 'bg-[var(--border)]'}`} />
              ))}
            </div>
          </Card>

          {questions.map((q, qIdx) => (
            <Card key={qIdx} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-xs font-bold text-[var(--bg-surface)] bg-slate-400">
                  {q.question_index + 1}
                </span>
                <div className="min-w-0">
                  {q.category && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-2 py-0.5 mb-1">
                      {q.category}
                    </span>
                  )}
                  <p className="font-semibold text-sm leading-relaxed text-[var(--text-primary)]">{q.question_text}</p>
                </div>
              </div>
              <div className="space-y-2 ml-10">
                {q.options.map((opt, oIdx) => {
                  const selected = answers[q.question_index] === oIdx;
                  return (
                    <button
                      type="button"
                      key={oIdx}
                      // Use a plain button (not a hidden radio) so clicking an
                      // option never triggers the browser's scroll-to-focus jump.
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.question_index]: oIdx }))}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 text-sm border ${
                        selected ? 'bg-teal-500/15 border-teal-500/60 text-[var(--text-primary)]' : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:border-teal-500/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 grid place-items-center shrink-0 ${selected ? 'border-teal-500 bg-teal-500' : 'border-[var(--border)]'}`}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={phase === 'submitting'} className="px-6 py-3">
              {phase === 'submitting' ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit & See Feedback'}
            </Button>
            <Button variant="secondary" onClick={handleReset}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === 'results' && result && (
        <div className="space-y-6">
          <Card className={`p-8 text-center ${scoreBg}`}>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-[var(--bg-surface)]">
              <span className={`text-4xl font-bold ${scoreColor}`}>{score}%</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Your Score</h2>
            <p className="text-sm mt-1 text-[var(--text-secondary)]">
              {result.correct_count} of {result.total} correct
            </p>
            <div className="mt-4 max-w-xs mx-auto h-2 rounded-full overflow-hidden bg-[var(--border)]">
              <div className={`h-full rounded-full transition-all duration-700 ${scoreColor.split(' ')[0]}`} style={{ width: `${score}%` }} />
            </div>
          </Card>

          {result.feedback ? (
            <Card className="p-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                <Brain className="w-4 h-4 text-indigo-400" /> AI Feedback
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--text-secondary)]">{result.feedback}</p>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                {feedbackLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                <p className="text-sm text-[var(--text-secondary)]">
                  {feedbackLoading ? 'Generating AI feedback…' : 'Feedback unavailable for this attempt.'}
                </p>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleReset} className="px-6 py-3">Practice Again</Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      )}
    </div>
  );
}
