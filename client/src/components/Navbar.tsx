import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authService } from '../services/auth';
import { Menu, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleAuthClick = async () => {
    if (token) {
      try { await authService.logout(); } catch {}
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  const initials = (name?: string | null) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/60">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        {/* Left: menu (mobile) + brand */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-md text-text-secondary hover:text-white hover:bg-primary"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/dashboard" className="text-lg sm:text-xl font-exponent font-bold text-text-primary">
          InterviewPrep Genie
        </Link>

        {/* Center: primary nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <Link to="/dashboard" className={`px-3 py-2 rounded-xl text-sm ${isActive('/dashboard') ? 'text-white bg-primary' : 'text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary'}`}>Dashboard</Link>
          <Link to="/practice/new" className={`px-3 py-2 rounded-xl text-sm ${isActive('/practice') ? 'text-white bg-primary' : 'text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary'}`}>Practice</Link>
          <Link to="/settings" className={`px-3 py-2 rounded-xl text-sm ${isActive('/settings') ? 'text-white bg-primary' : 'text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary'}`}>Settings</Link>
        </nav>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 rounded-md text-text-secondary hover:text-white hover:bg-primary"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {token ? (
            <div className="hidden sm:flex items-center gap-3 pr-2">
              <div className="text-right leading-tight">
                <div className="text-sm text-text-primary font-medium truncate max-w-[14rem]">{user?.name || 'Account'}</div>
                <div className="text-xs text-text-secondary truncate max-w-[14rem]">{user?.email}</div>
              </div>
              <div className="w-8 h-8 rounded-full border border-border bg-bg-surface-raised text-text-primary grid place-items-center text-xs font-semibold select-none" aria-hidden="true">
                {initials(user?.name)}
              </div>
            </div>
          ) : null}
          <button
            onClick={handleAuthClick}
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${token ? 'text-white bg-accent-record hover:brightness-110' : 'text-white bg-primary hover:bg-primary-hover'}`}
          >
            {token ? 'Logout' : 'Login'}
          </button>
        </div>
      </div>
    </header>
  );
}
