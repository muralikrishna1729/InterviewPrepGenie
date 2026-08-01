import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Edit,
  SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authService } from '../services/auth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/practice/new', label: 'Practice', icon: Edit },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore error
    }
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => path === location.pathname;

  const NavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-200 ${{
        true: 'text-white bg-primary',
        false: 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)]'
      }[isActive(to)]}`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 p-6 bg-[var(--bg-surface)] border-r border-[var(--border)]">
        <Link
          to="/dashboard"
          className="text-2xl font-exponent font-bold text-white mb-10"
          style={{ backgroundImage: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', color: 'transparent' }}
        >
          InterviewPrep <span className="text-[var(--accent-mint)]">Genie</span>
        </Link>

        <div className="flex flex-col gap-4 flex-grow">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} label={label} icon={icon} />
          ))}
        </div>

        <button
          className="mt-auto w-full flex items-center gap-2 rounded-2xl py-3 px-4 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)] transition"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>

        <button
          className="mt-2 w-full bg-accent-mint text-white py-3 rounded-xl shadow text-base font-semibold transition hover:brightness-110"
          onClick={toggle}
        >
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
      </nav>

      {/* Mobile bottom nav and drawer */}
      <div className="flex flex-col flex-1 min-h-screen md:hidden">
        <header
          className="sticky bottom-0 z-50 flex items-center justify-between px-4 py-2 bg-[var(--bg-surface)] border-t border-[var(--border)]"
        >
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-primary"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="text-lg font-exponent font-bold" style={{ color: 'var(--text-primary)' }}>
            InterviewPrep <span style={{ color: 'var(--accent-mint)' }}>Genie</span>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-primary"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <nav
          className={`fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] border-t border-[var(--border)] z-50 flex flex-col transition-transform duration-300 ease-in-out rounded-t-2xl p-4 gap-4 ${
            drawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="self-end p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-primary"
          >
            <X className="w-6 h-6" />
          </button>

          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} label={label} icon={icon} />
          ))}

          <button
            className="flex items-center gap-2 rounded-2xl py-3 px-4 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)] transition"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </nav>
      </div>
    </div>
  );
}
