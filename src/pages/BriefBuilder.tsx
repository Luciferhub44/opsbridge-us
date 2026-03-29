import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Building2, Target, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import MDEditor from '@uiw/react-md-editor';

const STEPS = [
  { id: 'company', title: 'Company Details', description: 'Tell us about your entity.', icon: Building2 },
  { id: 'goals', title: 'Operational Goals', description: 'What do you need?', icon: Target },
  { id: 'scope', title: 'Scope of Work', description: 'Review your project brief.', icon: FileText },
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
    budget: ''
  });
  const navigate = useNavigate();

  const handleNext = async () => {
    if (step === 0) {
      if (!formData.companyName || !formData.industry) {
        toast.error('Please fill in all required company details.');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!formData.needs) {
        toast.error('Please describe your operational needs.');
        return;
      }
      setLoading(true);
      try {
        const generatedSow = `# STATEMENT OF WORK: US OPERATIONAL EXPANSION

## 1. OVERVIEW
Expansion of **${formData.companyName}** into the US market.
**Industry:** ${formData.industry}

## 2. OBJECTIVES
- Establish local presence
- Manage regulatory compliance
- Optimize supply chain operations
- Accelerate go-to-market timeline

## 3. SCOPE OF SERVICES
${formData.needs}

## 4. ESTIMATED TIMELINE
- **Phase 1:** Setup & Strategy (Months 1-3)
- **Phase 2:** Operational Launch (Months 4-6)
- **Phase 3:** Scale & Refine (Months 7-12)

## 5. PROPOSED BUDGET
**Value:** ${formData.budget || 'To Be Determined based on provider bids.'}
`;
        setSow(generatedSow);
        setStep(2);
      } catch (error) {
        console.error('Error generating SOW:', error);
        toast.error('Failed to generate project scope.');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setLoading(true);
      try {
        if (!user) throw new Error("Not authenticated");
        
        const { error: dbError } = await supabase
          .from('projects')
          .insert([
            {
              client_id: user.id,
              title: `${formData.companyName} - US Expansion`,
              needs: formData.needs,
              sow: sow,
              status: 'in-review',
              value: formData.budget || 'TBD'
            }
          ]);
        
        if (dbError) throw dbError;
        
        toast.success('Project successfully created and submitted for review!');
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Error creating project:', error);
        toast.error(error.message || 'Failed to submit project.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="gap-2 text-muted-foreground hover:text-foreground mb-6 -ml-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Project Builder</h1>
          <p className="text-muted-foreground mt-2 font-medium">Create a comprehensive brief to connect with the right US operational partners.</p>
        </div>

        {/* Progress Tracker */}
        <div className="mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-muted/50 -translate-y-1/2 rounded-full overflow-hidden z-0">
             <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between relative z-10">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center gap-3">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-sm",
                  i < step ? "border-primary bg-primary text-primary-foreground scale-100" : 
                  i === step ? "border-primary bg-background text-primary scale-110 shadow-md ring-4 ring-primary/10" : 
                  "border-border bg-card text-muted-foreground scale-100"
                )}>
                  {i < step ? <CheckCircle2 className="h-6 w-6" /> : <s.icon className="h-5 w-5" />}
                </div>
                <div className="text-center">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest block mb-0.5 transition-colors",
                    i <= step ? "text-foreground" : "text-muted-foreground"
                  )}>Step {i + 1}</span>
                  <span className={cn(
                    "text-sm font-medium transition-colors hidden sm:block",
                    i <= step ? "text-muted-foreground" : "text-muted-foreground/50"
                  )}>{s.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Card className="p-0 border border-border bg-card rounded-3xl overflow-hidden shadow-sm transition-all">
            <div className="border-b border-border bg-muted/10 px-8 py-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                {React.createElement(STEPS[step].icon, { className: "h-6 w-6 text-primary" })}
                {STEPS[step].title}
              </h2>
              <p className="mt-1 text-muted-foreground font-medium">{STEPS[step].description}</p>
            </div>

            <div className="p-8 space-y-8">
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name <span className="text-rose-500">*</span></label>
                    <Input 
                      required
                      className="h-12 rounded-xl bg-background border-border text-base focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. Acme Corporation" 
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Industry <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        className="w-full h-12 rounded-xl border border-border bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium transition-all"
                        value={formData.industry}
                        onChange={e => setFormData({...formData, industry: e.target.value})}
                      >
                        <option value="">Select Industry</option>
                        <option value="Logistics">Logistics & Supply Chain</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Technology">Technology & Software</option>
                        <option value="Retail">Retail & E-commerce</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target US Location (Optional)</label>
                      <Input 
                        className="h-12 rounded-xl bg-background border-border text-base focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g. Texas, Austin" 
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Scope & Needs <span className="text-rose-500">*</span></label>
                    <p className="text-sm text-muted-foreground mb-3">Provide a detailed breakdown of your requirements. You can use formatting to structure your thoughts.</p>
                    <div data-color-mode="light" className="rounded-xl overflow-hidden border border-border">
                      <MDEditor
                        value={formData.needs}
                        onChange={(v) => setFormData({...formData, needs: v || ''})}
                        height={350}
                        preview="edit"
                        textareaProps={{
                          placeholder: "Describe what you are looking to achieve.\nFor example:\n- We need to set up a 10,000 sq ft warehouse in Texas.\n- Hire 5 key operational staff within 3 months.\n- Complete compliance checks for federal regulations."
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimated Budget (Optional)</label>
                    <Input 
                      className="h-12 rounded-xl bg-background border-border text-base focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. $50k - $100k or 'Open to bids'" 
                      value={formData.budget}
                      onChange={e => setFormData({...formData, budget: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Finalize the Scope of Work
                    </label>
                    <p className="text-sm text-muted-foreground mb-4">Review and refine the generated brief before publishing. This is what operational partners will see.</p>
                    <div data-color-mode="light" className="rounded-xl overflow-hidden border border-border shadow-sm">
                      <MDEditor
                        value={sow}
                        onChange={(v) => setSow(v || '')}
                        height={500}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-muted/10 px-8 py-5 flex items-center justify-between border-t border-border">
              <Button 
                variant="outline" 
                onClick={handleBack} 
                disabled={step === 0 || loading}
                className="h-11 px-6 rounded-xl font-semibold gap-2 transition-all active:scale-95 bg-background hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={loading}
                className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-semibold gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 hover:bg-primary/90"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : step === 2 ? (
                  <><CheckCircle2 className="h-4 w-4" /> Submit Project</>
                ) : (
                  <>Next Step <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}