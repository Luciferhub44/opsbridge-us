import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function VettingPage() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    entityName: '',
    ein: '',
    caseStudyTitle: '',
    operationalDetails: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('vetting_applications')
        .insert([
          {
            provider_id: user.id,
            entity_name: formData.entityName,
            ein: formData.ein,
            case_study_title: formData.caseStudyTitle,
            operational_details: formData.operationalDetails,
            status: 'pending'
          }
        ]);
        
      if (error) throw error;
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting vetting application:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Provider Vetting</h1>
          <p className="mt-2 text-zinc-600">Manual, prestige-based verification for US Business Owners.</p>
        </div>

        {!submitted ? (
          <Card className="p-8">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900">1. Entity Verification</h2>
                <p className="text-sm text-zinc-500">We verify your US business is active and in good standing via Middesk.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Legal Entity Name</label>
                    <Input 
                      placeholder="e.g. Acme Corp LLC" 
                      value={formData.entityName}
                      onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">EIN (Tax ID)</label>
                    <Input 
                      placeholder="XX-XXXXXXX" 
                      value={formData.ein}
                      onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900">2. Proof of Success</h2>
                <p className="text-sm text-zinc-500">Submit a case study of a successful US-based operation you've managed.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Case Study Title</label>
                  <Input 
                    placeholder="e.g. Scaling Texas Manufacturing for Global Auto" 
                    value={formData.caseStudyTitle}
                    onChange={(e) => setFormData({ ...formData, caseStudyTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Operational Details</label>
                  <Textarea 
                    className="min-h-[150px]"
                    placeholder="Describe the project, challenges, and outcomes..." 
                    value={formData.operationalDetails}
                    onChange={(e) => setFormData({ ...formData, operationalDetails: e.target.value })}
                  />
                </div>
                <div className="rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center hover:border-zinc-300 transition-colors cursor-pointer">
                  <Upload className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm font-medium text-zinc-900">Upload supporting documents</p>
                  <p className="text-xs text-zinc-500 mt-1">PDF, DOCX up to 10MB (Articles of Inc, Tax IDs, etc.)</p>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-zinc-400 shrink-0" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  By submitting, you agree to a manual review by our industry experts. This process typically takes 3-5 business days. 
                  We may contact you for additional professional references.
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSubmit} 
                disabled={loading || !formData.entityName || !formData.ein || !formData.caseStudyTitle || !formData.operationalDetails}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Verification'}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="text-center">
            <Card className="p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">Application Submitted</h2>
              <p className="mt-4 text-zinc-600 max-w-md mx-auto">
                Your vetting application is now being reviewed by our internal experts. 
                We will notify you via email once your status is updated.
              </p>
              <Button variant="outline" className="mt-8" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
