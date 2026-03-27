import React, { useState } from 'react';
import { ShieldCheck, Building2, Briefcase, ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../../lib/supabase';

interface ProviderOnboardingProps {
  user: any;
  onComplete: () => void;
}

export default function ProviderOnboarding({ user, onComplete }: ProviderOnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: user.company_name || user.companyName || '',
    industry: user.industry || '',
    location: user.location || '',
    bio: user.bio || '',
    ein: '',
    operationalDetails: '',
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step === 1) {
      if (!formData.companyName.trim() || !formData.industry.trim() || !formData.location.trim()) {
        toast.error('Please fill in all entity details.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.ein.trim() || !formData.ein.match(/^\d{2}-\d{7}$/)) {
        toast.error('Please enter a valid EIN (XX-XXXXXXX).');
        return;
      }
    }
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!formData.operationalDetails.trim()) {
      toast.error('Please provide operational details.');
      return;
    }
    setLoading(true);
    try {
      const userId = user.id || user.uid;
      
      const userUpdateData = {
        company_name: formData.companyName,
        industry: formData.industry,
        location: formData.location,
        bio: formData.bio,
        onboarding_completed: true,
        is_verified: false,
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(userUpdateData)
        .eq('id', userId);

      if (updateError) throw updateError;
      
      toast.success("Onboarding completed successfully!");
      
      const { error: vettingError } = await supabase
        .from('vetting_applications')
        .insert([{
          user_id: userId,
          provider_id: userId,
          entity_name: formData.companyName,
          ein: formData.ein,
          case_study_title: 'Initial Onboarding Application',
          operational_details: formData.operationalDetails,
          status: 'pending'
        }]);

      if (vettingError) throw vettingError;

      onComplete();
    } catch (error) {
      console.error("Onboarding submission error:", error);
      toast.error("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        <button 
          onClick={onComplete}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground mb-6">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Entity Details</h2>
                <p className="text-muted-foreground mt-2 text-lg">Tell us about your US-based business entity.</p>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Legal Company Name</label>
                  <Input 
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Acme Operations LLC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Primary Industry</label>
                    <Input 
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g. Manufacturing"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Primary State</label>
                    <Input 
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Texas"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Verification</h2>
                <p className="text-muted-foreground mt-2 text-lg">We need to verify your business status.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Employer Identification Number (EIN)</label>
                  <Input 
                    value={formData.ein}
                    onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                    placeholder="XX-XXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground italic">This will be used for Dun & Bradstreet verification only.</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-sm text-muted-foreground">Your data is encrypted and only accessible by our internal vetting team.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground mb-6">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Operational Focus</h2>
                <p className="text-muted-foreground mt-2 text-lg">What kind of projects are you best suited for?</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Public Bio (Visible to Clients)</label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-xl border border-border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Briefly describe your business to potential clients..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Operational Details & Expertise (For Vetting)</label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-xl border border-border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={formData.operationalDetails}
                    onChange={(e) => setFormData({ ...formData, operationalDetails: e.target.value })}
                    placeholder="Describe your facilities, team size, and specific US regulatory experience..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center justify-between">
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-all",
                    step === i + 1 ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground font-bold text-sm"
                onClick={onComplete}
              >
                Skip for now
              </Button>
              <Button 
                size="lg" 
                className="gap-2 px-8 rounded-full h-14 text-lg" 
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    {step === totalSteps ? 'Complete Setup' : 'Continue'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
