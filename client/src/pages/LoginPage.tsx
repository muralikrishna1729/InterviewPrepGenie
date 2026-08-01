import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Brain } from 'lucide-react';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const { access_token, user } = await authService.login(data);
      setAuth(access_token, user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: any } };
      const msg = anyErr?.response?.data?.detail || 'Sign in failed. Please check your credentials.';
      setError('root', { message: typeof msg === 'string' ? msg : 'Sign in failed.' });
    }
  };

  return (
    <div className="px-4 pt-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand mb-4">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to continue your practice</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8 shadow-card" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)]" style={{ background: 'var(--bg-surface-raised)', borderColor: errors.email ? 'var(--accent-record)' : 'var(--border)', color: 'var(--text-primary)' }} {...register('email')} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-accent-record">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input id="login-password" type="password" autoComplete="current-password" placeholder="Your password" className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)]" style={{ background: 'var(--bg-surface-raised)', borderColor: errors.password ? 'var(--accent-record)' : 'var(--border)', color: 'var(--text-primary)' }} {...register('password')} />
              </div>
              {errors.password && <p className="mt-1 text-xs text-accent-record">{errors.password.message}</p>}
            </div>

            {/* Root error */}
            {errors.root && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-record)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {errors.root.message}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">Sign in</Button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
            New to Interview Prep Genie?{' '}
            <Link to="/signup" className="font-medium" style={{ color: 'var(--primary)' }}>Create an account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
