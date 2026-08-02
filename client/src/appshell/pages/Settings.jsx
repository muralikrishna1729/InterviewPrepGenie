import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useWebcam } from '../../hooks/useWebcam';
import { authService } from '../../services/auth';
import { resumeService } from '../../services/resume';
import { Camera, Sun, Moon, LogOut, FileText, Upload, X, Loader2 } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const { isActive, videoRef, startWebcam, stopWebcam, permissionError } = useWebcam({ audio: false });

  // Default resume state
  const [defaultResume, setDefaultResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState(null);
  const resumeInputRef = useRef(null);

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    logout(); // clears the auth token cookie + store
    navigate('/login');
  };

  const handleToggleCameraTest = async () => {
    if (isActive) {
      stopWebcam();
    } else {
      try {
        await startWebcam();
      } catch {
        // permissionError is handled inside the hook
      }
    }
  };

  // Load the existing default resume on mount
  useEffect(() => {
    let mounted = true;
    resumeService.getDefault()
      .then((res) => { if (mounted && res.filename) setDefaultResume(res.filename); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleResumeUpload = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!f) return;
    setResumeLoading(true);
    setResumeError(null);
    try {
      const res = await resumeService.setDefault(f);
      setDefaultResume(res.filename);
    } catch (err) {
      setResumeError(err?.response?.data?.detail || 'Failed to save default resume.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleRemoveResume = async () => {
    setResumeLoading(true);
    setResumeError(null);
    try {
      await resumeService.removeDefault();
      setDefaultResume(null);
    } catch (err) {
      setResumeError(err?.response?.data?.detail || 'Failed to remove default resume.');
    } finally {
      setResumeLoading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'IP';

  return (
    <div className="space-y-4">
      {/* Page heading */}
      <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>

      {/* Profile Info */}
      <Card>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Info</h2>
        <div className="mt-4 flex items-center gap-4">
          {/* Avatar badge */}
          <div className="w-12 h-12 shrink-0 rounded-full bg-indigo-600 text-white font-semibold text-lg flex items-center justify-center">
            {initials}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1 text-sm flex-1">
            <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>Name</div>
            <div className="sm:col-span-2" style={{ color: 'var(--text-primary)' }}>
              {user?.name || <span style={{ color: 'var(--text-secondary)' }}>Not available</span>}
            </div>
            <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>Email</div>
            <div className="sm:col-span-2" style={{ color: 'var(--text-primary)' }}>
              {user?.email || <span style={{ color: 'var(--text-secondary)' }}>Not available</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Test My Camera */}
      <Card>
        <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Camera className="w-5 h-5 text-indigo-400" />
          Test My Camera
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Check access and preview your camera setup.
        </p>

        {isActive && (
          <div className="mt-4 relative max-w-md aspect-video rounded-xl overflow-hidden bg-black border border-[var(--border)]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
        )}

        {permissionError && (
          <p className="mt-2 text-sm text-red-500 font-medium">
            Camera error: {permissionError}. Please verify browser permissions.
          </p>
        )}

        <div className="mt-4">
          <Button
            onClick={handleToggleCameraTest}
            variant={isActive ? "secondary" : "primary"}
            className="px-6 py-3"
          >
            {isActive ? 'Stop camera test' : 'Test my camera'}
          </Button>
        </div>
      </Card>

      {/* Default Resume */}
      <Card>
        <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileText className="w-5 h-5 text-indigo-400" />
          Default Resume
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Set a default resume — it's pre-selected when you start a practice interview or analysis, so you don't re-upload it every time. You can still change it before starting.
        </p>

        {defaultResume ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-[var(--bg-surface-raised)]">
                <FileText className="w-4 h-4 text-teal-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{defaultResume}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Default resume</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input ref={resumeInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
              <Button variant="secondary" onClick={() => resumeInputRef.current?.click()} disabled={resumeLoading} className="px-4 py-2 text-sm">
                <Upload className="w-4 h-4" /> Change
              </Button>
              <Button variant="secondary" onClick={handleRemoveResume} disabled={resumeLoading} className="px-4 py-2 text-sm !text-red-500 !border-red-500/40">
                <X className="w-4 h-4" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <input ref={resumeInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
            <Button onClick={() => resumeInputRef.current?.click()} disabled={resumeLoading} variant="secondary" className="px-5 py-2.5">
              {resumeLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Upload className="w-4 h-4" /> Upload default resume</>}
            </Button>
          </div>
        )}

        {resumeError && <p className="mt-2 text-sm text-red-500 font-medium">{resumeError}</p>}
      </Card>

      {/* Theme */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Theme</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Switch between light and dark mode.
            </p>
          </div>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 border border-indigo-500 text-indigo-400 hover:bg-indigo-900/20 bg-transparent rounded-full px-4 py-2 transition font-semibold text-sm focus:outline-none"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Toggle to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </Card>

      {/* Logout */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Account</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Sign out of this device.
            </p>
          </div>
          <Button onClick={handleLogout} variant="destructive" className="px-6 py-3">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}
