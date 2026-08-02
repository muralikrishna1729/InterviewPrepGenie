import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { Upload, FileText, Loader2, AlertTriangle, Check, Sparkles, TrendingUp, ShieldCheck, Wand2 } from 'lucide-react';
import { resumeService } from '../../services/resume';
import { usePersistedState } from '../../hooks/usePersistedState';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function FeedbackCard({ title, items, icon, bullet, bulletColor, accentBg }) {
  if (!items || items.length === 0) return null;
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: accentBg }}>{icon}</div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span className="font-bold shrink-0 mt-0.5" style={{ color: bulletColor }}>{bullet}</span>
            <span className="leading-snug text-[var(--text-secondary)]">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ScoreDisplay({ score }) {
  const SIZE = 108;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (score / 100) * CIRC;
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fcd34d' : '#f87171';
  const label = score >= 75 ? 'Strong resume!' : score >= 50 ? 'Good — room to grow' : 'Needs improvements';

  return (
    <Card className={`p-8 text-center ${score >= 75 ? 'bg-teal-500/5' : score >= 50 ? 'bg-amber-500/5' : 'bg-red-500/5'}`}>
      <div className="flex flex-col items-center">
        <div className="relative inline-flex items-center justify-center mb-3">
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={STROKE} />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold leading-none text-[var(--text-primary)]">{score}</span>
            <span className="text-[10px] font-semibold mt-0.5 text-[var(--text-secondary)] opacity-70">/ 100</span>
          </div>
        </div>
        <h2 className="text-base font-semibold mb-1 text-[var(--text-primary)]">Resume Score</h2>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </Card>
  );
}

export default function ResumePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = usePersistedState('resume.jobDescription', '');
  const [analysisId, setAnalysisId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Poll the analysis until it completes
  useEffect(() => {
    if (phase !== 'analyzing' || !analysisId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await resumeService.getById(analysisId);
        if (res.status === 'completed') {
          stopPolling();
          setAnalysis(res);
          setPhase('done');
        } else if (res.status === 'failed') {
          stopPolling();
          setPhase('failed');
          setError('Resume analysis failed. Please try again.');
        }
      } catch {
        // transient — keep polling
      }
    }, 2000);
    return stopPolling;
  }, [phase, analysisId, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  const validateFile = useCallback((f) => {
    if (!ALLOWED_TYPES.includes(f.type)) return 'Invalid file type. Please upload a PDF or DOCX file.';
    if (f.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 5 MB.';
    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile) => {
    setError(null); setAnalysis(null); setAnalysisId(null); setPhase('idle');
    if (!selectedFile) { setFile(null); return; }
    const err = validateFile(selectedFile);
    if (err) { setError(err); setFile(null); return; }
    setFile(selectedFile);
  }, [validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null); setPhase('uploading');
    try {
      const res = await resumeService.analyze(file, jobDescription);
      setAnalysisId(res.id);
      setFile(null);
      // If it completed synchronously (rare), show immediately
      if (res.status === 'completed') {
        setAnalysis(res); setPhase('done');
      } else {
        setPhase('analyzing');
      }
    } catch (err) {
      setPhase('failed');
      setError(err?.response?.data?.detail || 'Failed to analyze resume. Please try again.');
    }
  };

  const handleReset = () => {
    stopPolling();
    setFile(null); setAnalysis(null); setAnalysisId(null); setError(null); setPhase('idle');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Resume Analyzer</h1>
      <p className="text-sm text-[var(--text-secondary)] -mt-4">
        Upload your resume for AI-powered feedback and ATS optimization tips.
      </p>

      {error && (
        <Card className="border border-red-500/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          </div>
        </Card>
      )}

      {/* ── UPLOAD FORM ── */}
      {phase !== 'done' && (
        <Card>
          <h2 className="text-base font-semibold mb-1 text-[var(--text-primary)]">Upload your resume</h2>
          <p className="text-xs mb-5 text-[var(--text-secondary)] opacity-70">PDF or DOCX &nbsp;•&nbsp; Max 5 MB</p>

          {/* Resume dropzone + Job description — side by side on md+, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
                Resume <span className="text-red-400">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className="relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer h-full"
                style={{
                  borderColor: isDragging ? 'var(--primary)' : file ? 'rgba(45,212,167,.5)' : 'var(--border)',
                  background: isDragging ? 'rgba(99,102,241,.06)' : file ? 'rgba(45,212,167,.04)' : 'transparent',
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  aria-label="Upload resume file"
                />
                <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-4 bg-[var(--bg-surface)]">
                  {file ? <Check className="w-7 h-7 text-teal-400" /> : <Upload className="w-7 h-7 text-[var(--text-secondary)]" />}
                </div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">
                  {file ? file.name : isDragging ? 'Drop here!' : 'Drag & drop or click to browse'}
                </p>
                <p className="text-xs mt-1 text-[var(--text-secondary)] opacity-70">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF or DOCX accepted'}
                </p>
              </div>
            </div>

            {/* Optional job description — the resume is scored against this role */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
                Job Description <span className="text-xs opacity-70">(optional — score against a role)</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={7}
                placeholder="Paste the job description here to score your resume against a specific role and get tailored keyword suggestions…"
                className="w-full h-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleAnalyze} disabled={!file || phase === 'uploading' || phase === 'analyzing'} className="px-6 py-3">
              {phase === 'uploading' || phase === 'analyzing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {phase === 'uploading' ? 'Uploading…' : 'Analyzing…'}</>
              ) : (
                <><FileText className="w-4 h-4" /> Analyze Resume</>
              )}
            </Button>
            {file && phase === 'idle' && <Button variant="secondary" onClick={() => handleFileSelect(null)}>Clear</Button>}
          </div>
        </Card>
      )}

      {/* ── ANALYZING ── */}
      {phase === 'analyzing' && (
        <Card className="text-center py-10">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-[var(--text-primary)] font-medium">Analyzing your resume…</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Scoring strengths, weaknesses, and ATS-friendliness.</p>
        </Card>
      )}

      {/* ── RESULTS ── */}
      {phase === 'done' && analysis && (
        <div className="space-y-6">
          <ScoreDisplay score={analysis.score ?? 0} />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeedbackCard title="Strengths" items={analysis.strengths}
              icon={<Check className="w-4 h-4 text-teal-400" />} accentBg="rgba(74,222,128,.1)" bulletColor="#4ade80" bullet="✓" />
            <FeedbackCard title="Weak Areas" items={analysis.weaknesses}
              icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} accentBg="rgba(252,211,77,.1)" bulletColor="#fcd34d" bullet="!" />
            <FeedbackCard title="Grammar & Clarity" items={analysis.grammar_suggestions}
              icon={<Sparkles className="w-4 h-4 text-blue-400" />} accentBg="rgba(96,165,250,.1)" bulletColor="#60a5fa" bullet="→" />
            <FeedbackCard title="ATS Optimization" items={analysis.ats_tips}
              icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />} accentBg="rgba(99,102,241,.12)" bulletColor="#818cf8" bullet="•" />
            <FeedbackCard title="Improvements" items={analysis.improvements}
              icon={<TrendingUp className="w-4 h-4 text-violet-400" />} accentBg="rgba(139,92,246,.12)" bulletColor="#a78bfa" bullet="→" />
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <Wand2 className="w-6 h-6 text-indigo-400 mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">Analyze another resume to track how your edits improve the score.</p>
            </Card>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleReset} className="px-6 py-3">Analyze Another Resume</Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      )}
    </div>
  );
}
