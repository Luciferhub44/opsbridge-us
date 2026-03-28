import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Building2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  DollarSign,
  Calendar,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function Payments() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Provider States
  const [paymentProfile, setPaymentProfile] = useState<any>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupForm, setSetupForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: ''
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [voidedCheckUrl, setVoidedCheckUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common/Client States
  const [payments, setPayments] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    projectId: '',
    amount: '',
    scheduledDate: '',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        if (profile.role === 'provider') {
          // Fetch Payment Profile
          const { data: profileData, error: profileError } = await supabase
            .from('payment_profiles')
            .select('*')
            .eq('provider_id', profile.id)
            .maybeSingle();
            
          if (profileError) throw profileError;
          setPaymentProfile(profileData);
          
          if (!profileData || profileData.status === 'rejected') {
            setIsSettingUp(true);
            if (profileData?.status === 'rejected') {
               setSetupForm({
                 bankName: profileData.bank_name || '',
                 accountName: profileData.account_name || '',
                 accountNumber: profileData.account_number || '',
                 routingNumber: profileData.routing_number || ''
               });
               setVoidedCheckUrl(profileData.voided_check_url || '');
            }
          }
        }

        // Fetch Payments
        let paymentsQuery = supabase
          .from('payments')
          .select('*, project:projects(title), provider:profiles!payments_provider_id_fkey(display_name, company_name, email)')
          .order('scheduled_date', { ascending: true });

        if (profile.role === 'client') {
          paymentsQuery = paymentsQuery.eq('client_id', profile.id);
        } else if (profile.role === 'provider') {
          paymentsQuery = paymentsQuery.eq('provider_id', profile.id);
        }

        const { data: paymentsData, error: paymentsError } = await paymentsQuery;
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

        // Fetch Active Projects for Client Scheduling
        if (profile.role === 'client') {
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, title, provider_id, provider:profiles!projects_provider_id_fkey(display_name, company_name)')
            .eq('client_id', profile.id)
            .eq('status', 'active');
            
          if (projectsError) throw projectsError;
          setActiveProjects(projectsData?.filter(p => p.provider_id) || []);
        }

      } catch (error) {
        console.error("Error fetching payment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Setup Subscriptions
    const paymentsChannel = supabase
      .channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .subscribe();
      
    const profileChannel = supabase
      .channel('payment_profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_profiles', filter: `provider_id=eq.${profile.id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment_documents')
        .getPublicUrl(fileName);

      setVoidedCheckUrl(publicUrl);
      toast.success('Voided check uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSetupPaymentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (!voidedCheckUrl) {
      toast.error('Please upload a voided check for verification.');
      return;
    }

    setSavingPayment(true);
    try {
      if (paymentProfile?.id) {
         // Update existing (likely rejected) profile
         const { error } = await supabase.from('payment_profiles').update({
           bank_name: setupForm.bankName,
           account_name: setupForm.accountName,
           account_number: setupForm.accountNumber,
           routing_number: setupForm.routingNumber,
           voided_check_url: voidedCheckUrl,
           status: 'pending' // Reset status to pending for re-review
         }).eq('id', paymentProfile.id);
         
         if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase.from('payment_profiles').insert([{
          provider_id: profile.id,
          bank_name: setupForm.bankName,
          account_name: setupForm.accountName,
          account_number: setupForm.accountNumber,
          routing_number: setupForm.routingNumber,
          voided_check_url: voidedCheckUrl,
          status: 'pending'
        }]);

        if (error) throw error;
      }

      toast.success('Payment details submitted for verification.');
      setIsSettingUp(false);
      // Fetch data will be triggered by realtime
    } catch (error: any) {
      console.error('Error saving payment profile:', error);
      toast.error('Failed to submit payment details.');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSchedulePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const project = activeProjects.find(p => p.id === scheduleForm.projectId);
    if (!project || !project.provider_id) {
      toast.error('Please select a valid active project.');
      return;
    }

    setSavingPayment(true);
    try {
      const { error } = await supabase.from('payments').insert([{
        project_id: project.id,
        client_id: profile.id,
        provider_id: project.provider_id,
        amount: parseFloat(scheduleForm.amount),
        scheduled_date: scheduleForm.scheduledDate,
        notes: scheduleForm.notes,
        status: 'scheduled'
      }]);

      if (error) throw error;

      toast.success('Payment scheduled successfully!');
      setIsScheduling(false);
      setScheduleForm({ projectId: '', amount: '', scheduledDate: '', notes: '' });

      // Notify Provider
      await supabase.from('notifications').insert([{
        user_id: project.provider_id,
        title: 'Payment Scheduled',
        message: `A payment of $${parseFloat(scheduleForm.amount).toFixed(2)} has been scheduled for project "${project.title}" on ${new Date(scheduleForm.scheduledDate).toLocaleDateString()}.`,
        read: false
      }]);

    } catch (error: any) {
      console.error('Error scheduling payment:', error);
      toast.error('Failed to schedule payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading payment information...</p>
      </div>
    );
  }

  // --- PROVIDER VIEW: SETUP & PENDING ---
  if (profile?.role === 'provider' && isSettingUp) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="flex items-start gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Setup Payment Information</h2>
            <p className="text-muted-foreground mt-1 font-medium">Provide your business banking details to receive payouts via ACH/Wire Transfer.</p>
          </div>
        </div>

        {paymentProfile?.status === 'rejected' && (
          <Card className="p-4 border border-rose-200 bg-rose-50/50 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">Verification Rejected</h4>
              <p className="text-sm text-rose-700/80 mt-1">Your previous submission was rejected by our admins. Please ensure all details match exactly and upload a clear copy of your voided check.</p>
            </div>
          </Card>
        )}

        <Card className="p-6 md:p-8 border border-border bg-card rounded-2xl shadow-sm">
          <form onSubmit={handleSetupPaymentProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bank Name</label>
                <Input 
                  required
                  value={setupForm.bankName}
                  onChange={(e) => setSetupForm({ ...setupForm, bankName: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border"
                  placeholder="e.g. Chase Bank"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Holder Name</label>
                <Input 
                  required
                  value={setupForm.accountName}
                  onChange={(e) => setSetupForm({ ...setupForm, accountName: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border"
                  placeholder="Business Legal Name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Number</label>
                <Input 
                  required
                  type="password" // Obscure while typing
                  value={setupForm.accountNumber}
                  onChange={(e) => setSetupForm({ ...setupForm, accountNumber: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border"
                  placeholder="••••••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Routing Number</label>
                <Input 
                  required
                  value={setupForm.routingNumber}
                  onChange={(e) => setSetupForm({ ...setupForm, routingNumber: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border"
                  placeholder="9 Digit ABA Routing Number"
                  maxLength={9}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Verification Document</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground">Voided Check / Bank Letter</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a PDF or image confirming your account details.</p>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingDoc}
                      className="h-9 px-4 text-xs font-semibold"
                    >
                      {uploadingDoc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Choose File
                    </Button>
                    {voidedCheckUrl && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Uploaded</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
              {paymentProfile?.status === 'approved' && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsSettingUp(false)}
                  className="h-11 px-8 rounded-xl font-semibold border-border hover:bg-muted shadow-sm"
                >
                  Cancel Update
                </Button>
              )}
              <Button type="submit" disabled={savingPayment || uploadingDoc} className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm transition-all active:scale-95">
                {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {savingPayment ? 'Submitting...' : 'Submit for Verification'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (profile?.role === 'provider' && paymentProfile?.status === 'pending') {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center flex flex-col items-center">
        <div className="h-20 w-20 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-6">
          <Clock className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Verification Pending</h2>
        <p className="text-muted-foreground text-sm font-medium max-w-md mx-auto">
          Your banking information and voided check are currently being reviewed by our admins. This usually takes 1-2 business days. You will be able to view your payments once approved.
        </p>
      </div>
    );
  }

  // --- MAIN VIEW (Client & Approved Providers) ---
  const unsettledTotal = payments
    .filter(p => p.status === 'scheduled' || p.status === 'processing')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const completedTotal = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payments Hub</h2>
            <p className="text-muted-foreground mt-1 font-medium">Manage your project payouts, schedules, and financial history.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'client' && (
            <Button 
              className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95 gap-2"
              onClick={() => setIsScheduling(true)}
            >
              <DollarSign className="h-5 w-5" />
              Schedule Payment
            </Button>
          )}
          {profile?.role === 'provider' && paymentProfile?.status === 'approved' && (
            <Button 
              variant="outline"
              className="h-11 px-6 rounded-xl font-semibold border-border hover:bg-muted transition-all shadow-sm gap-2"
              onClick={() => {
                setSetupForm({
                  bankName: paymentProfile.bank_name || '',
                  accountName: paymentProfile.account_name || '',
                  accountNumber: paymentProfile.account_number || '',
                  routingNumber: paymentProfile.routing_number || ''
                });
                setVoidedCheckUrl(paymentProfile.voided_check_url || '');
                setIsSettingUp(true);
              }}
            >
              <Building2 className="h-4 w-4" />
              Update Banking Info
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4 border border-blue-200 bg-blue-50/50 rounded-xl flex items-start gap-3 shadow-sm">
        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Secure Processing via American Express</h4>
          <p className="text-sm text-blue-800/80 mt-1 leading-relaxed">
            All payments are securely processed by American Express. Once a payment is scheduled by a client, the funds are immediately and successfully debited from their account, meaning scheduled payments <strong>cannot be cancelled</strong>. When a payment status changes to <strong>Paid Out</strong>, please allow 1-5 business days for the funds to arrive in the designated bank account.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-border bg-card rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unsettled</span>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{formatCurrency(unsettledTotal)}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Scheduled or processing</p>
          </div>
        </Card>
        
        <Card className="p-6 border border-border bg-card rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{formatCurrency(completedTotal)}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Successfully paid out</p>
          </div>
        </Card>
      </div>

      {isScheduling && profile?.role === 'client' && (
        <Card className="p-6 border border-primary/20 bg-primary/5 rounded-2xl shadow-sm relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-4 right-4 text-muted-foreground hover:bg-muted"
            onClick={() => setIsScheduling(false)}
          >
            Cancel
          </Button>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Schedule New Payment
          </h3>
          <form onSubmit={handleSchedulePayment} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Active Project</label>
                <select 
                  required
                  value={scheduleForm.projectId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, projectId: e.target.value })}
                  className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:ring-1 focus:ring-primary appearance-none outline-none font-medium"
                >
                  <option value="">Select Project</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (Provider: {p.provider?.company_name || p.provider?.display_name})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    value={scheduleForm.amount}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, amount: e.target.value })}
                    className="h-10 rounded-lg bg-background border-border pl-9"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scheduled Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    type="date"
                    min={new Date().toISOString().split('T')[0]} // Cannot schedule in past
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                    className="h-10 rounded-lg bg-background border-border pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes / Memo (Optional)</label>
                <Input 
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="h-10 rounded-lg bg-background border-border"
                  placeholder="e.g. Milestone 1 Payment"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={savingPayment} className="h-10 px-8 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
                {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {savingPayment ? 'Scheduling...' : 'Confirm Schedule'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
        <div className="border-b border-border bg-muted/20 px-6 py-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Payment History & Schedule</h3>
        </div>
        <div className="divide-y divide-border">
          {payments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border border-border text-muted-foreground">
                <DollarSign className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">No payments found.</h4>
              <p className="text-muted-foreground text-sm mt-1">Scheduled and completed payments will appear here.</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                    payment.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                    payment.status === 'processing' ? "bg-blue-50 text-blue-600 border-blue-200" :
                    payment.status === 'failed' ? "bg-rose-50 text-rose-600 border-rose-200" :
                    "bg-amber-50 text-amber-600 border-amber-200"
                  )}>
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-foreground">{formatCurrency(payment.amount)}</h4>
                      <div className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                        payment.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                        payment.status === 'processing' ? "bg-blue-50 text-blue-600 border-blue-200" :
                        payment.status === 'failed' ? "bg-rose-50 text-rose-600 border-rose-200" :
                        "bg-amber-50 text-amber-600 border-amber-200"
                      )}>
                        {payment.status === 'completed' ? 'Paid Out' : payment.status}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground mt-0.5 truncate">
                      Project: <span className="text-foreground">{payment.project?.title}</span>
                    </div>
                    {payment.notes && (
                      <div className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded-md border border-border inline-block">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end text-sm gap-1 shrink-0">
                  {profile?.role === 'client' && payment.provider && (
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      To: <span className="text-foreground">{payment.provider.company_name || payment.provider.display_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs mt-1 sm:mt-0">
                    <Calendar className="h-3.5 w-3.5" />
                    {payment.status === 'completed' ? 'Paid on' : 'Scheduled for'} {new Date(payment.scheduled_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}