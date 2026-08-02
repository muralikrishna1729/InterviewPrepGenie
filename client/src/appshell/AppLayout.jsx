import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Edit, Settings, LogOut, Sun, Moon, FileText, Menu, X } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/practice', label: 'Practice', icon: Edit },
  { to: '/mcq', label: 'MCQ', icon: FileText },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { theme, toggle } = useThemeStore();
  const { user, token, logout, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar state: `collapsed` (desktop rail vs full) + `hovering` (temporary expand)
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Bug 8: if user data is missing but token exists, fetch profile on layout mount
  useEffect(() => {
    if (token && !user) {
      authService.getProfile()
        .then((profile) => setUser(profile))
        .catch(() => {});
    }
  }, [token, user, setUser]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'IP';

  // Effective sidebar width: full when expanded, rail when collapsed (unless hovering)
  const expanded = collapsed ? hovering : true;
  const sidebarWidth = expanded ? 'w-64' : 'w-[72px]';

  return (
    <div
      className="h-screen overflow-hidden flex"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Desktop sidebar (md+) — pinned on scroll, collapsible.
           No toggle icon: hovering expands it temporarily; clicking the rail
           pins it open (and unpins). Navigation links still work while pinned. ── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 self-start sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 ${sidebarWidth}`}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        // Toggle the pin only when the rail background itself is clicked (not a nav link)
        onClick={(e) => { if (e.target === e.currentTarget) setCollapsed((v) => !v); }}
      >
        <div className={`flex items-center ${expanded ? 'px-5 py-5' : 'justify-center py-5'}`}>
          {expanded ? (
            <Link
              to="/dashboard"
              className="text-xl font-extrabold tracking-tight transition whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              InterviewPrep <span className="text-indigo-400">Genie</span>
            </Link>
          ) : (
            <Link to="/dashboard" title="Dashboard" className="text-xl leading-none" aria-label="Dashboard">
              <span className="text-indigo-400">🧞</span>
            </Link>
          )}
        </div>

        <nav className="px-3 py-2 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition whitespace-nowrap ${expanded ? '' : 'justify-center'}`}
              style={
                isActive(to)
                  ? { background: 'var(--primary)', color: '#fff' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {expanded && label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            title="Logout"
            className={`w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition whitespace-nowrap ${expanded ? '' : '!px-0'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {expanded && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Mobile slide-in drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
            style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-5 py-5">
              <Link to="/dashboard" className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                InterviewPrep <span className="text-indigo-400">Genie</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-md transition hover:bg-[var(--bg-surface-raised)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition"
                  style={
                    isActive(to)
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
        {/* Top bar — sticky */}
        <header
          className="sticky top-0 z-20"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="h-14 flex items-center gap-1 px-4">
            {/* Menu toggle — mobile (opens drawer) */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-md transition hover:bg-[var(--bg-surface-raised)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Useful quick links in the top navbar */}
            <nav className="hidden lg:flex items-center gap-1 ml-3">
              {nav.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                    isActive(to)
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right side: theme toggle + user info */}
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="p-2 rounded-md transition"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-raised)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right leading-tight">
                  <div className="text-sm font-medium truncate max-w-[12rem]" style={{ color: 'var(--text-primary)' }}>
                    {user?.name || 'Account'}
                  </div>
                  <div className="text-xs truncate max-w-[12rem]" style={{ color: 'var(--text-secondary)' }}>
                    {user?.email || ''}
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-full grid place-items-center text-[10px] font-semibold"
                  style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-30"
        style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 text-xs"
              style={{ color: isActive(to) ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
