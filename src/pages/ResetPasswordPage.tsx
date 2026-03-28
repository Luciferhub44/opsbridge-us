import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we actually have an active session for the password recovery
    // Supabase client should automatically parse the #access_token in the URL 
    // and establish a session.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;
      
      setSuccessMsg("Password updated successfully!");
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      console.error("Reset Error:", err);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Please enter your new password below.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !!successMsg}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-medium rounded-xl mt-6" disabled={loading || !!successMsg}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
            </Button>
            
            <div className="text-center pt-4">
              <button 
                type="button" 
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold text-foreground hover:underline"
              >
                Back to login
              </button>
            </div>
          </form>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest">
          <ShieldCheck className="h-4 w-4" />
          Enterprise-Grade Security
        </div>
      </div>
    </div>
  );
}
