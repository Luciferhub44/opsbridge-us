import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { id: 'company', title: 'Company Details', description: 'Tell us about your international entity.' },
  { id: 'goals', title: 'Operational Goals', description: 'What are you looking to achieve in the US?' },
  { id: 'scope', title: 'Scope & SOW', description: 'Review and refine your project scope.' },
];

export default function BriefBuilder() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sow, setSow] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    location: '',
    needs: '',
  });
  const navigate = useNavigate();

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setLoading(true);
      try {
        // Mock SOW generation since AI is removed
        const generatedSow = `STATEMENT OF WORK: US OPERATIONAL EXPANSION

1. OVERVIEW
Expansion of ${formData.companyName} into the US market.

2. OBJECTIVES
- Establish local presence
- Manage regulatory compliance
- Optimize supply chain operations

3. SCOPE OF SERVICES
${formData.needs}

4. TIMELINE
Phase 1: Setup (Months 1-3)
Phase 2: Operational Launch (Months 4-6)
Phase 3: Scale (Months 7-12)`;
        setSow(generatedSow);
        setStep(2);
      } catch (error) {
        console.error('Error generating SOW:', error);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setLoading(true);
      try {
        if (!user) throw new Error("Not authenticated");
        
        const { error } = await supabase
          .from('projects')
          .insert([
            {
              client_id: user.id,
              title: `${formData.companyName} - US Expansion`,
              needs: formData.needs,
              sow: sow,
              status: 'in-review',
              value: 'TBD'
            }
          ]);
        
        if (error) throw error;
        
        navigate('/dashboard');
      } catch (error) {
        console.error('Error creating project:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                  i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                )}>
                  {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  i <= step ? "text-foreground" : "text-muted-foreground"
                )}>{s.title}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-4 h-1 w-full bg-border rounded-full">
            <div 
              className="absolute h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div key={step}>
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-foreground">{STEPS[step].title}</h2>
              <p className="mt-1 text-muted-foreground">{STEPS[step].description}</p>

              <div className="mt-8 space-y-6">
                {step === 0 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Company Name</label>
                      <Input 
                        placeholder="e.g. Global Auto Gmbh" 
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Industry</label>
                      <Input 
                        placeholder="e.g. Automotive Manufacturing" 
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Target US Location (Optional)</label>
                      <Input 
                        placeholder="e.g. Texas, South Carolina" 
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {step === 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Operational Needs</label>
                    <Textarea 
                      className="min-h-[200px]"
                      placeholder="Describe your needs in detail. e.g. We need to set up a 50-person warehouse in South Carolina, handle local tax nexus, and manage the supply chain for automotive parts." 
                      value={formData.needs}
                      onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Our platform will transform this into a structured Statement of Work (SOW).</p>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="prose prose-stone max-w-none rounded-lg border border-border bg-background p-6">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                        {sow}
                      </pre>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">SOW Generated successfully. You can now publish this RFP to verified providers.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={handleBack} 
                  disabled={step === 0 || loading}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={loading || (step === 0 && !formData.companyName) || (step === 1 && !formData.needs)}
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : step === 2 ? (
                    'Publish RFP'
                  ) : (
                    <>
                      Next <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
