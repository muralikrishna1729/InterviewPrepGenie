import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, User } from 'lucide-react';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export function SignupPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      // API expects `name`, map from our `full_name`
      const payload = { name: data.full_name, email: data.email, password: data.password };
      const { access_token, user } = await authService.signup(payload as any);
      setAuth(access_token, user);
      navigate('/dashboard');
    } catch (err: unknown) {
      // Normalize FastAPI/Pydantic error shapes
      const anyErr = err as { response?: { data?: any } };
      const detail = anyErr?.response?.data?.detail;

      const toMsg = (d: unknown): string => {
        if (!d) return 'Sign up failed. Please try again.';
        if (typeof d === 'string') return d;
        if (Array.isArray(d)) {
          // Pydantic v2 errors: [{ loc, msg, type, input }, ...]
          const msgs = d.map((item: any) => item?.msg || (typeof item === 'string' ? item : 'Validation error'));
          return msgs.join('; ');
        }
        if (typeof d === 'object' && 'msg' in (d as any)) return (d as any).msg as string;
        try { return JSON.stringify(d); } catch { return String(d); }
      };

      // Try to set field-specific messages when available
      if (Array.isArray(detail)) {
        for (const item of detail) {
          const path = Array.isArray(item?.loc) ? item.loc : [];
          const field =
            path.includes('full_name') || path.includes('name') ? 'full_name' :
            path.includes('email') ? 'email' :
            path.includes('password') ? 'password' : null;
          if (field && item?.msg) {
            setError(field as keyof FormData, { message: item.msg });
          }
        }
      }

      setError('root', { message: toMsg(detail) });
    }
  };

  return (
    <div className="px-4 pt-6 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand mb-4">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Create your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Start practicing interviews with AI
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8 shadow-card"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Full name */}
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Full name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none
                    transition-colors focus:ring-2 focus:ring-[var(--primary)]"
                  style={{
                    background: 'var(--bg-surface-raised)',
                    borderColor: errors.full_name ? 'var(--accent-record)' : 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('full_name')}
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-xs text-accent-record">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none
                    transition-colors focus:ring-2 focus:ring-[var(--primary)]"
                  style={{
                    background: 'var(--bg-surface-raised)',
                    borderColor: errors.email ? 'var(--accent-record)' : 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-accent-record">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none
                    transition-colors focus:ring-2 focus:ring-[var(--primary)]"
                  style={{
                    background: 'var(--bg-surface-raised)',
                    borderColor: errors.password ? 'var(--accent-record)' : 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-accent-record">{errors.password.message}</p>
              )}
            </div>

            {/* Root error */}
            {errors.root && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: 'var(--accent-record)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                {errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full"
              size="lg"
            >
              Create account
            </Button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
