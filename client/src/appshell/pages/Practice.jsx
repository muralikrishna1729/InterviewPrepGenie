import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { Upload, X, Briefcase, Cog, Layers, Hash, FileText, Loader2, Gauge } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import { interviewService } from '../../services/interview';

const INTERVIEW_TYPES = ['Technical', 'Behavioral', 'HR', 'Mixed'];
const EXPERIENCES = ['Fresher', '1–3 yrs', '3–5 yrs', '5+ yrs'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const ROLES = [
  'Software Engineer (Fresher)',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'QA/Test Engineer',
  'DevOps Engineer (Fresher)',
  'Python Developer',
  'Java Developer',
  'GenAI/ML Engineer (Fresher)'
];

const TECH_POOL = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust',
  'React', 'Vue', 'Angular', 'Next.js', 'Svelte',
  'Node.js', 'FastAPI', 'Django', 'Flask', 'Express', 'Spring Boot',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Git', 'REST APIs', 'GraphQL', 'gRPC',
  'HTML/CSS', 'Tailwind CSS', 'Sass',
  'Machine Learning', 'PyTorch', 'TensorFlow', 'LangChain',
  'Kafka', 'RabbitMQ', 'Celery', 'Nginx',
];

export default function Practice() {
  const navigate = useNavigate();

  // Form state
  const [jobDesc, setJobDesc] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [interviewType, setInterviewType] = useState('Technical');
  const [experience, setExperience] = useState('Fresher');
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState([]);
  const [showTechPool, setShowTechPool] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Medium');
  const [resume, setResume] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const techInputRef = useRef(null);

  const isTechOrMixed = interviewType === 'Technical' || interviewType === 'Mixed';
  const hasTech = techStack.length > 0;
  const valid = role.trim().length > 0 && jobDesc.trim().length > 0 && (!isTechOrMixed || hasTech) && questionCount >= 3 && questionCount <= 30;

  // Handlers
  const handleUseSampleJD = () => {
    const sampleJDs = {
      'Software Engineer (Fresher)': 'We are looking for a Software Engineer (Fresher) to join our team. Requirements: Basic understanding of algorithms, data structures, and computer science fundamentals. Experience with at least one programming language (Python, Java, C++, or JavaScript). Strong problem-solving and communication skills.',
      'Backend Developer': 'We are looking for a Backend Developer to build scalable APIs and system architecture. Requirements: Proficiency in Python/Node.js/Go, SQL/NoSQL databases, RESTful APIs, and basic understanding of cloud services (AWS/GCP).',
      'Frontend Developer': 'We are looking for a Frontend Developer with strong knowledge of HTML, CSS, and modern JS frameworks like React. Requirements: Experience with responsive design, state management (Redux/Zustand), and performance optimization.',
      'Full Stack Developer': 'Seeking a Full Stack Developer experienced with both frontend frameworks (React/Vue) and backend technologies (Node.js/Python). Must be comfortable with database design, API integrations, and cloud hosting.',
      'Data Analyst': 'Seeking a Data Analyst to translate data into actionable insights. Requirements: Strong SQL skills, Python/R, experience with data visualization tools (Tableau/PowerBI), and basic statistical understanding.',
      'QA/Test Engineer': 'Looking for a QA/Test Engineer to design and execute test plans. Requirements: Manual testing experience, automation frameworks (Selenium/Playwright), bug tracking (Jira), and API testing.',
      'DevOps Engineer (Fresher)': 'Looking for an entry-level DevOps Engineer passionate about CI/CD, containerization (Docker), cloud infrastructure (AWS), and Linux scripting/administration.',
      'Python Developer': 'We are looking for a Python Developer to develop and maintain robust applications. Requirements: Strong Python knowledge, familiarity with frameworks like Django/FastAPI, and database query optimization.',
      'Java Developer': 'Seeking a Java Developer. Requirements: Strong Core Java, Spring Boot microservices framework, Hibernate ORM, and experience with relational databases (MySQL/PostgreSQL).',
      'GenAI/ML Engineer (Fresher)': 'We are looking for a GenAI/ML Engineer (Fresher). Requirements: Basic understanding of Machine Learning and Deep Learning concepts, hands-on experience with Python, PyTorch/TensorFlow, and familiarity with LLM APIs (OpenAI/Anthropic/Gemini).'
    };

    const matchedJD = sampleJDs[role] || 'We are looking for a junior developer to join our engineering department. You will collaborate on codebase features, debug issues, write unit tests, and participate in peer code reviews. Requirements: strong coding fundamentals, familiarity with Git, and a passion for learning new technologies.';
    setJobDesc(matchedJD);
  };

  const addTech = (value) => {
    const v = String(value).trim();
    if (!v) return;
    setTechStack((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setTechInput('');
  };
  const onTechKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTech(techInput);
    } else if (e.key === 'Backspace' && !techInput && techStack.length) {
      setTechStack((prev) => prev.slice(0, -1));
    }
  };
  const removeTech = (tag) => setTechStack((prev) => prev.filter((t) => t !== tag));

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && /\.(pdf|docx?)$/i.test(f.name)) setResume(f);
  };
  const onFilePick = (e) => {
    const f = e.target.files?.[0];
    if (f && /\.(pdf|docx?)$/i.test(f.name)) setResume(f);
  };

  const setSetupPayload = useSessionStore((s) => s.setSetupPayload);
  const resetSession = useSessionStore((s) => s.resetSession);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    if (!valid) return;
    setSubmitError(null);
    setSubmitting(true);
    resetSession(); // Clear any stale session ID and other data in the store

    const payload = {
      role: role.trim(),
      interview_type: interviewType,
      experience_level: experience,
      tech_stack: techStack,
      number_of_questions: questionCount,
      job_description: jobDesc,
      resume_name: resume?.name,
    };

    const expMap = {
      'Fresher': 'Entry',
      '1–3 yrs': 'Entry',
      '3–5 yrs': 'Mid',
      '5+ yrs': 'Senior'
    };

    try {
      // Create backend session for persistence, then navigate
      const created = await interviewService.create({
        role: payload.role,
        interview_type: payload.interview_type,
        tech_stack: payload.tech_stack,
        experience_level: expMap[payload.experience_level] || 'Entry',
        number_of_questions: payload.number_of_questions,
        difficulty,
      });

      // Save setup payload only after successful creation
      setSetupPayload(payload);
      navigate(`/interview/${created.id}`);
    } catch (err) {
      console.error('Failed to create interview:', err);
      let errorMsg = 'Failed to create interview. Please try again.';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map((d) => d.msg).join(', ');
        } else if (data.message) {
          errorMsg = data.message;
        }
      }
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <h1 className="text-3xl font-extrabold tracking-tight">Practice</h1>

      {/* Setup card */}
      <Card>
        <h2 className="text-xl font-semibold">Setup your mock interview</h2>
        <p className="mt-1 text-slate-600 text-sm">Provide details below for targeted questions. Resume is optional but recommended.</p>

        {/* Grid */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {/* Job Description (full width) */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><FileText className="w-4 h-4"/> Job description</label>
              <button
                type="button"
                onClick={handleUseSampleJD}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition"
              >
                Use a sample JD
              </button>
            </div>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the JD to tailor your interview..."
              className="mt-2 w-full h-32 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Resume upload (full width) */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Upload className="w-4 h-4"/> Resume (PDF/DOCX) — optional</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`mt-2 rounded-xl border-2 border-dashed p-6 text-sm flex items-center justify-between ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="text-slate-600">
                {resume ? (
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{resume.name}</span>
                    <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => setResume(null)}><X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <span>Drag & drop your resume here, or click to browse</span>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-indigo-600 hover:underline">Choose file</button>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFilePick} />
              </div>
            </div>
          </div>

          {/* Role / Experience */}
          <div>
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Briefcase className="w-4 h-4"/> Target role / title</label>
            <select
              value={isCustomRole ? 'other' : role}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'other') {
                  setIsCustomRole(true);
                  setRole('');
                } else {
                  setIsCustomRole(false);
                  setRole(val);
                }
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="other">Other / Type manually</option>
            </select>
            {isCustomRole && (
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Type your custom role..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Layers className="w-4 h-4"/> Experience level</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPERIENCES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setExperience(e)}
                  aria-pressed={experience === e}
                  className={`px-3 py-1.5 rounded-full text-sm ${experience === e ? 'text-white bg-indigo-600' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Gauge className="w-4 h-4"/> Difficulty</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={`px-3 py-1.5 rounded-full text-sm ${difficulty === d ? 'text-white bg-indigo-600' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Interview type */}
          <div>
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Cog className="w-4 h-4"/> Interview type</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInterviewType(t)}
                  aria-pressed={interviewType === t}
                  className={`px-3 py-1.5 rounded-full text-sm ${interviewType === t ? 'text-white bg-indigo-600' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Hash className="w-4 h-4"/> Number of questions</label>
            <input
              type="number"
              min={3}
              max={30}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(30, Math.max(3, Number(e.target.value))))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-400">3–30 questions</p>
          </div>

          {/* Tech stack (full width) */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 inline-flex items-center gap-2"><Layers className="w-4 h-4"/> Tech stack</label>
            <div
              className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-text"
              onClick={() => { setShowTechPool(true); techInputRef.current?.focus(); }}
            >
              <div className="flex flex-wrap gap-2">
                {techStack.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1">
                    {t}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTech(t); }} className="text-indigo-500 hover:text-indigo-700"><X className="w-3 h-3"/></button>
                  </span>
                ))}
                <input
                  ref={techInputRef}
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={onTechKeyDown}
                  onFocus={() => setShowTechPool(true)}
                  onBlur={() => setTimeout(() => setShowTechPool(false), 150)}
                  placeholder={techStack.length === 0 ? "e.g. Python, FastAPI, PostgreSQL" : ""}
                  className="min-w-[10rem] flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 py-1"
                />
              </div>
            </div>

            {/* Selectable tech pool */}
            {showTechPool && (
              <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-md">
                <p className="text-xs text-slate-500 mb-2 font-medium">Click to add, or type a custom skill above</p>
                <div className="flex flex-wrap gap-1.5">
                  {TECH_POOL.filter((t) => !techInput || t.toLowerCase().includes(techInput.toLowerCase())).map((t) => {
                    const selected = techStack.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseDown={(e) => { e.preventDefault(); if (!selected) addTech(t); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-indigo-100 text-indigo-400 border-indigo-200 cursor-default'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                        }`}
                      >
                        {selected ? '✓ ' : ''}{t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-1.5 flex flex-col gap-1">
              <p className="text-xs text-slate-400">Click from the pool above, or type and press Enter / comma to add a custom skill</p>
              {isTechOrMixed && !hasTech && (
                <p className="text-xs text-red-500 font-medium">
                  Add at least one skill for a Technical interview
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Errors & Actions */}
        <div className="mt-6 space-y-4">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {submitError}
            </div>
          )}
          <Button onClick={handleStart} disabled={!valid || submitting} className="w-full px-6 py-3">
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </span>
            ) : (
              'Start Interview'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
