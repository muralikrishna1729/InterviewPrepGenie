import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/themeStore";
import { useWebcam } from "../hooks/useWebcam";
import { authService } from "../services/auth";
import { Button } from "../components/Button";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { theme, toggle } = useThemeStore();

  const {
    isActive: isCamActive,
    permissionError,
    videoRef,
    startWebcam,
  } = useWebcam({ audio: false });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    authService.getProfile()
      .then((user) => {
        if (mounted) setProfile({ name: user.name, email: user.email });
      })
      .catch(() => {
        if (mounted) setError("Failed to load profile");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleTestCamera = () => {
    setError(null);
    startWebcam();
  };

  const handleLogout = async () => {
    await authService.logout();
    // You should also clear your auth token storage and store here if needed
    // Then redirect to login
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <h1 className="text-3xl font-exponent font-semibold mb-6">Settings</h1>

      <section className="mb-6 rounded-2xl p-6 shadow-md" style={{ background: "var(--bg-surface-raised)", border: "1px solid var(--border)" }}>
        <h2 className="mb-4 text-xl font-exponent font-semibold" style={{ color: "var(--text-primary)" }}>
          Profile Info
        </h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {profile && (
          <div>
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl p-6 shadow-md" style={{ background: "var(--bg-surface-raised)", border: "1px solid var(--border)" }}>
        <h2 className="mb-4 text-xl font-exponent font-semibold" style={{ color: "var(--text-primary)" }}>
          Test my camera
        </h2>
        <Button onClick={handleTestCamera} className="mb-4">
          {isCamActive ? "Camera active" : "Test my camera"}
        </Button>
        {permissionError && <p className="text-red-600">{permissionError}</p>}
        {isCamActive && (
          <video ref={videoRef} autoPlay muted playsInline className="rounded-md max-w-full max-h-64 border" />
        )}
      </section>

      <section className="mb-6 rounded-2xl p-6 shadow-md flex items-center justify-between" style={{ background: "var(--bg-surface-raised)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-exponent font-semibold" style={{ color: "var(--text-primary)" }}>
          Theme
        </h2>
        <button onClick={toggle} className="bg-accent-mint text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-accent-mint/80 transition">
          Toggle to {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </section>

      <section className="rounded-2xl p-6 shadow-md text-right" style={{ background: "var(--bg-surface-raised)", border: "1px solid var(--border)" }}>
        <Button onClick={handleLogout} className="bg-accent-record font-semibold px-4 py-2 rounded-lg shadow hover:bg-accent-record/80 transition">
          Logout
        </Button>
      </section>
    </div>
  );
}
