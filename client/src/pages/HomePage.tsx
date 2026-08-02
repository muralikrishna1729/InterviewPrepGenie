import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Star,
  Check,
  PlayCircle,
  ChevronDown,
  Target,
  Timer,
  Bot,
  TrendingUp,
  Infinity as InfinityIcon,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Accent color classes (violet/indigo vibe)
const ACCENT_BG = 'bg-indigo-600';
const ACCENT_BG_SOFT = 'bg-indigo-50';
const ACCENT_TEXT = 'text-indigo-600';

export default function HomePage() {
  // FAQ state: single open at a time
  const [openIdx, setOpenIdx] = useState<number>(0);

  // Auth state: personalize CTA for signed-in visitors
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthed = !!token;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';
  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'IP';

  const faq: { q: string; a: string }[] = [
    {
      q: 'Will this help me perform better in real interviews?',
      a: 'Yes. Practicing realistic questions with timed reps and instant feedback helps you respond confidently and concisely under pressure — the way it feels in an actual interview.'
    },
    {
      q: 'Is it tailored to my target role?',
      a: 'You can select your role and tech stack to focus on what matters. Role-specific prompts and follow-ups help you prepare for exactly what recruiters expect.'
    },
    {
      q: 'Will I get feedback on my answers?',
      a: 'Absolutely. After each response you’ll receive AI-powered feedback and pointers, including structure, clarity, and impact — so you improve with every attempt.'
    },
    {
      q: 'How quickly can I get interview‑ready?',
      a: 'Many users notice stronger, more structured answers after just a few focused sessions. Consistency compounds results — aim for short daily practice.'
    },
    {
      q: 'Can I practice multiple times?',
      a: 'Yes. You get unlimited practice attempts. Repetition turns strong points into muscle memory and reduces rambling or hesitation.'
    },
    {
      q: 'Do I need a job description to use it?',
      a: 'It helps, but it’s not required. Provide a role or stack for targeted practice, or start with general behavioral and technical sets.'
    },
    {
      q: 'Can I practice different question types (behavioral, technical, HR)?',
      a: 'Yes. Mix behavioral and technical rounds, add HR screeners, and switch difficulty levels as you gain confidence.'
    },
    {
      q: 'What makes this different from just practicing alone?',
      a: 'You’ll get guided prompts, realistic pacing, and actionable feedback. Instead of guessing what to improve, you’ll focus on the exact areas that boost your performance.'
    }
  ];

  const features = [
    { icon: Target, tag: 'Popular', title: 'Role‑specific sets', desc: 'Practice the questions that actually show up — tuned to your target role and stack.' },
    { icon: Timer, tag: 'New', title: 'Timed mode', desc: 'Simulate real pressure with countdown prompts and answer pacing.' },
    { icon: Bot, tag: 'AI‑Powered', title: 'Smart feedback', desc: 'Get instant notes on clarity, structure, depth, and impact after each answer.' },
    { icon: TrendingUp, tag: 'Popular', title: 'Progress tracking', desc: 'See trends over time to focus your prep and build durable habits.' },
    { icon: InfinityIcon, tag: 'Unlimited', title: 'Unlimited practice', desc: 'Rehearse until your stories and explanations feel effortless.' },
    { icon: ShieldCheck, tag: 'Privacy', title: 'Privacy‑first', desc: 'Your practice sessions stay private and secure while you improve.' },
  ];

  const checklist = [
    'Turn weak answers into clear, strong stories',
    'Replace hesitation with a proven structure',
    'Handle tough follow‑ups without freezing',
    'Target the hardest questions for your role',
    'Respond faster and sound more confident',
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${ACCENT_TEXT}`} />
            <span className="font-semibold tracking-tight">Interview Prep Genie</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {isAuthed ? (
              <>
                <Link to="/dashboard" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                  <span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold text-white ${ACCENT_BG}`} aria-hidden="true">
                    {initials}
                  </span>
                  {firstName ? `Hi, ${firstName}` : 'Dashboard'}
                </Link>
                <Link to="/dashboard" className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${ACCENT_BG} hover:brightness-110`}>
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Log in</Link>
                <Link to="/signup" className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${ACCENT_BG} hover:brightness-110`}>
                  Sign up
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-transparent to-transparent" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:pt-20 sm:pb-20">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
            <div className="flex -space-x-2 pr-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[0,1,2,3,4].map(i => <Star key={i} className={`w-3.5 h-3.5 fill-current ${ACCENT_TEXT}`} />)}
            </div>
            <span> Loved by 12,000+ learners</span>
          </div>

          {/* Headline */}
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Practice real questions with
            {' '}
            <span className={`${ACCENT_TEXT}`}>AI Mock Interview</span>
            {' '}sessions.
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-3xl">
            Stop freezing mid‑answer. Build confident, structured responses so you walk into interviews prepared — not guessing.
          </p>
          <p className="mt-3 text-slate-600 max-w-2xl">
            Interview Prep Genie helps you rehearse behavioral and technical rounds, get instant feedback, and improve with every attempt.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={isAuthed ? "/dashboard" : "/signup"} className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white ${ACCENT_BG} hover:brightness-110 shadow-lg shadow-indigo-200`}>
              {isAuthed ? 'Go to Dashboard' : 'Start Your Mock Interview'}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="flex -space-x-2">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border border-white" />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Star className={`w-4 h-4 fill-current ${ACCENT_TEXT}`} />
                <span className="font-semibold text-slate-900">4.9</span>
                <span> • 10k+ sessions</span>
              </div>
            </div>
          </div>

          <p className="mt-10 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            It’s not what you know — it’s how you say it.
          </p>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="grid gap-6 md:grid-cols-2 bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-6 sm:p-10">
          {/* Left */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Turn interview nerves into confident delivery</h2>
            <p className="mt-3 text-slate-600">Most candidates underperform not because they lack knowledge — but because answers come out unstructured under pressure. Practice the right way and you’ll stand out.</p>
            <ul className="mt-6 space-y-3">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full ${ACCENT_BG_SOFT}`}>
                    <Check className={`w-3 h-3 ${ACCENT_TEXT}`} />
                  </span>
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Right: mini UI preview */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Question 3 of 10</span>
              <span className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> 01:30</span>
            </div>
            <div className="mt-3 text-slate-900 font-medium">
              Tell me about a time you had to persuade teammates to adopt your solution. What was the impact?
            </div>
            <textarea
              disabled
              placeholder="Type your answer here..."
              className="mt-4 w-full h-28 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex items-center gap-4">
              <button className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${ACCENT_BG} hover:brightness-110`}>
                <PlayCircle className="w-4 h-4" /> Check Answer
              </button>
              <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Show Answer</button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Improves Performance */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Improve where it actually moves the needle</h2>
          <p className="mt-3 text-slate-600">Practice that translates directly into calmer delivery, stronger stories, and sharper technical explanations.</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Featured card */}
          <div className={`md:col-span-2 rounded-2xl ${ACCENT_BG} text-white p-8 shadow-lg`}>
            <h3 className="text-2xl font-bold">Confidence isn’t luck — it’s reps</h3>
            <p className="mt-2 text-indigo-100">Short, focused sessions train you to think out loud, structure your answers, and keep momentum even on tough follow‑ups.</p>
          </div>

          {/* Small cards */}
          <div className="grid gap-6 md:col-span-1">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h4 className="font-semibold">Stand out from generic answers</h4>
              <p className="mt-2 text-slate-600">Stop rambling. Use clear frameworks so your answers feel intentional, not improvised.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h4 className="font-semibold">Target what recruiters value</h4>
              <p className="mt-2 text-slate-600">Focus on impact, tradeoffs, and collaboration — the signals hiring teams look for.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h4 className="font-semibold">Build durable interview skills</h4>
            <p className="mt-2 text-slate-600">Practice turns strong points into default habits that show up under pressure.</p>
          </div>
          <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-center">
            <p className="font-semibold">Prep that compounds into offers — not just “good practice.”</p>
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How it works</h2>
          <p className="mt-3 text-slate-600">Four simple steps to go from anxious to prepared.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-4">
          {[
            { title: 'Pick your role', desc: 'Paste a job description or choose your role and stack to target your prep.' },
            { title: 'Answer questions', desc: 'Work through realistic prompts one by one with gentle time pressure.' },
            { title: 'Get instant feedback', desc: 'Receive clear notes on clarity, depth, and structure after each response.' },
            { title: 'Build confidence', desc: 'Repeat short sessions until answers feel natural and strong.' },
          ].map((s, i) => (
            <div key={s.title} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col">
              <div className={`w-9 h-9 rounded-lg ${ACCENT_BG_SOFT} ${ACCENT_TEXT} grid place-items-center font-bold`}>{i+1}</div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-slate-600 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to={isAuthed ? "/dashboard" : "/signup"} className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white ${ACCENT_BG} hover:brightness-110`}>
            {isAuthed ? 'Go to Dashboard' : 'Start practicing now'}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-3 text-sm text-slate-600">
            Explore more tools: <Link to="/resume" className={`${ACCENT_TEXT} hover:underline`}>Resume Analyzer</Link> • <Link to="/mcq" className={`${ACCENT_TEXT} hover:underline`}>MCQ Practice</Link>
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything you need</h2>
          <p className="mt-3 text-slate-600">All the essentials for confident behavioral and technical rounds.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, tag, title, desc }) => (
            <div key={title} className="relative rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${ACCENT_BG_SOFT} ${ACCENT_TEXT}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="absolute top-4 right-4 inline-block text-[10px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
                {tag}
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-slate-600 text-sm">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold ${ACCENT_TEXT} border-indigo-200 hover:bg-indigo-50`}>
            See all features
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Frequently asked questions</h2>
          <p className="mt-3 text-slate-600">Straight answers to help you start faster.</p>
        </div>

        <div className="mt-8 divide-y divide-slate-200 rounded-2xl bg-white shadow-sm border border-slate-200">
          {faq.map((item, i) => {
            const open = openIdx === i;
            return (
              <button
                key={item.q}
                onClick={() => setOpenIdx(open ? -1 : i)}
                className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-3"
                aria-expanded={open}
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-medium text-slate-900">{item.q}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                  {open && (
                    <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 md:grid-cols-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <UserCircle2 className={`w-5 h-5 ${ACCENT_TEXT}`} />
              <span className="font-semibold">Interview Prep Genie</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 max-w-xs">AI‑powered mock interviews that build real confidence and better answers.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Tools</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/practice" className="hover:text-slate-900">Mock Interview</Link></li>
              <li><Link to="/resume" className="hover:text-slate-900">Resume Analyzer</Link></li>
              <li><Link to="/mcq" className="hover:text-slate-900">MCQ Practice</Link></li>
              <li><Link to="/practice" className="hover:text-slate-900">Practice</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="#" className="hover:text-slate-900">About</Link></li>
              <li><Link to="#" className="hover:text-slate-900">Careers</Link></li>
              <li><Link to="#" className="hover:text-slate-900">Contact</Link></li>
              <li><Link to="#" className="hover:text-slate-900">Press</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Resources</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="#" className="hover:text-slate-900">Guides</Link></li>
              <li><Link to="#" className="hover:text-slate-900">Blog</Link></li>
              <li><Link to="#" className="hover:text-slate-900">Help Center</Link></li>
              <li><Link to="#" className="hover:text-slate-900">Community</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Interview Prep Genie. All rights reserved.</span>
            <div className="hidden sm:flex items-center gap-4">
              <Link to="#" className="hover:text-slate-900">Privacy</Link>
              <Link to="#" className="hover:text-slate-900">Terms</Link>
              <Link to="#" className="hover:text-slate-900">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
