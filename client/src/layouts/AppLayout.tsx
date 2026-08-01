import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LogOut,
  Moon,
  Sun,
  Brain,
  Menu,
  X,
  Home,
  Edit,
  SettingsIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authService } from '../services/auth';
import { Navbar } from '../components/Navbar';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/practice/new', label: 'Practice', icon: Edit },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }
    logout();
    navigate('/login');
  };

  // Always show layout for protected routes (they're wrapped by ProtectedRoute)

  const NavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-200 ${
          isActive ? 'text-white bg-primary' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)]'
        }`}
      >
        <Icon className="w-5 h-5" /> {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 min-h-0">

      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 p-6 bg-bg-surface border-r border-border">
        <Link
          to="/dashboard"
          className="text-2xl font-exponent font-bold text-white mb-10"
          style={{ backgroundImage: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', color: 'transparent' }}
        >
          InterviewPrep <span className="text-[var(--accent-mint)]">Genie</span>
        </Link>

        <nav className="flex flex-col gap-4 flex-grow">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-2xl py-3 px-4 text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary transition"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex flex-col flex-1 min-h-0">
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border z-50 md:hidden flex flex-col transition-transform duration-300 ease-in-out rounded-t-2xl p-4 gap-4 ${
            sidebarOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="self-end p-2 rounded-md text-text-secondary hover:text-white hover:bg-primary"
          >
            <X className="w-6 h-6" />
          </button>

          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
              />
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl py-3 px-4 text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary transition"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </nav>
        </aside>
      </div>
      </div>
    </div>
  );
}
