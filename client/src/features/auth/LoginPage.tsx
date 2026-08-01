import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../lib/api';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-12" style={{ color: 'var(--text-primary)' }}>
      <div
        className="w-full max-w-md mx-auto rounded-2xl border border-[var(--border)] p-8"
        style={{ backgroundColor: 'var(--bg-surface-raised)' }}
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-exponent font-bold tracking-tight mb-2">
            InterviewPrep <span
              className="bg-gradient-to-r bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--gradient-brand)' }}
            >Genie</span>
          </h1>
          <p className="text-[var(--text-secondary)]">Welcome back! Please sign in.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Input
            label="Email address"
            type="email"
            id="login-email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            id="login-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            autoComplete="current-password"
          />

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171' }}
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-xs font-medium" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              or
            </span>
          </div>
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-accent-mint hover:text-accent-mint/80 transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
