import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useWebcam } from '../../hooks/useWebcam';
import { Camera, Sun, Moon } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const { isActive, videoRef, startWebcam, stopWebcam, permissionError } = useWebcam({ audio: false });

  const handleToggleCameraTest = async () => {
    if (isActive) {
      stopWebcam();
    } else {
      try {
        await startWebcam();
      } catch (err) {
        // permissionError is handled inside the hook
      }
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
    </div>
  );
}
