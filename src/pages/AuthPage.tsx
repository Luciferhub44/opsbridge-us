import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Full Name is required for sign up.');
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          navigate('/dashboard');
        } else {
          setSuccessMsg('Account created! Please check your email to verify your account.');
          setEmail('');
          setPassword('');
          setFullName('');
          setMode('login');
        }
      } else if (mode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSuccessMsg('Password reset link sent! Please check your email.');
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: 'login' | 'signup' | 'forgot_password') => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xl">O</div>
          <span className="text-2xl font-bold tracking-tight">OpsBridge US</span>
        </div>

        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' ? 'Log in to manage your US operations.' 
               : mode === 'signup' ? 'Join the elite network of US operational partners.' 
               : 'Enter your email and we will send you a reset link.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Full Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required={mode === 'signup'}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Email</label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {mode !== 'forgot_password' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => toggleMode('forgot_password')}
                      className="text-xs font-semibold text-foreground hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required={mode === 'login' || mode === 'signup'}
                />
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg font-medium rounded-xl mt-6" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> 
               : mode === 'login' ? 'Sign In' 
               : mode === 'signup' ? 'Create Account' 
               : 'Send Reset Link'}
            </Button>

            {mode !== 'forgot_password' && (
              <div className="text-center pt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By continuing, you agree to our <Link to="/terms" className="underline">Terms of Service</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </div>
            )}
            
            {mode === 'forgot_password' && (
              <div className="text-center pt-4">
                <button 
                  type="button" 
                  onClick={() => toggleMode('login')}
                  className="text-sm font-semibold text-foreground hover:underline"
                >
                  Back to login
                </button>
              </div>
            )}
          </form>

          {mode !== 'forgot_password' && (
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => toggleMode(mode === 'login' ? 'signup' : 'login')}
                  className="ml-1 font-semibold text-foreground hover:underline"
                  type="button"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          )}
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest">
          <ShieldCheck className="h-4 w-4" />
          Enterprise-Grade Security
        </div>
      </div>
    </div>
  );
}
