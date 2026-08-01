import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Edit, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/practice', label: 'Practice', icon: Edit },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { theme, toggle } = useThemeStore();
  const { user, token, logout, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Bug 8: if user data is missing but token exists, fetch profile on layout mount
  useEffect(() => {
    if (token && !user) {
      authService.getProfile()
        .then((profile) => setUser(profile))
        .catch(() => {});
    }
  }, [token, user, setUser]);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'IP';

  return (
    <div
      className="h-screen overflow-hidden flex"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col h-full"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-5 py-5">
          <Link
            to="/dashboard"
            className="text-xl font-extrabold tracking-tight transition"
            style={{ color: 'var(--text-primary)' }}
          >
            InterviewPrep <span className="text-indigo-400">Genie</span>
          </Link>
        </div>

        <nav className="px-3 py-2 space-y-1">
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

        <div className="mt-auto p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

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

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="h-14 flex items-center justify-end gap-3 px-4">
            {/* Theme toggle */}
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

            {/* User info */}
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
        </header>

        <main className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
