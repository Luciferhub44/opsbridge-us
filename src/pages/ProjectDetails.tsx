import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  Send,
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MDEditor from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const fetchProjectAndApps = async () => {
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError || !projectData) {
          console.error('Error fetching project:', projectError);
          navigate('/dashboard');
          return;
        }
        setProject(projectData);

        const { data: appsData, error: appsError } = await supabase
          .from('project_applications')
          .select('*, provider:profiles!project_applications_provider_id_fkey(display_name, company_name, photo_url)')
          .eq('project_id', id);

        if (!appsError && appsData) {
          setApplications(appsData);
        }
      } catch (error) {
        console.error('Error in fetchProjectAndApps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndApps();

    const channel = supabase
      .channel(`project_apps_${id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'project_applications',
          filter: `project_id=eq.${id}`
        }, 
        () => {
          // Re-fetch applications on change
          supabase
            .from('project_applications')
            .select('*, provider:profiles!project_applications_provider_id_fkey(display_name, company_name, photo_url)')
            .eq('project_id', id)
            .then(({ data }) => {
              if (data) setApplications(data);
            });
        }
      )
      .subscribe();

    const appsChannel = supabase
      .channel(`project_apps_realtime_${id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'project_applications',
          filter: `project_id=eq.${id}`
        }, 
        (payload) => {
          setApplications(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(appsChannel);
    };
  }, [id, navigate]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;
    
    if (!message || message.trim() === '') {
      toast.error('Please enter a proposal message.');
      return;
    }

    setApplying(true);
    try {
      const { error: appError } = await supabase
        .from('project_applications')
        .insert([
          {
            project_id: id,
            provider_id: profile.id,
            message,
            status: 'pending'
          }
        ]);

      if (appError) throw appError;
      
      // Trigger notification for project owner
      if (project.client_id) {
        await supabase.from('notifications').insert([
          {
            user_id: project.client_id,
            title: 'New Project Application',
            message: `A provider has applied for your project: ${project.title}`,
            read: false
          }
        ]);
      }

      setMessage('');
      
      toast.success("Your application has been submitted successfully!");
      
      // Re-fetch to update state immediately
      const { data: newApps } = await supabase
        .from('project_applications')
        .select('*, provider:profiles!project_applications_provider_id_fkey(display_name, company_name, photo_url)')
        .eq('project_id', id);
        
      if (newApps) {
        setApplications(newApps);
      }
      
    } catch (error: any) {
      console.error('Error applying for project:', error);
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleAcceptApplication = async (app: any) => {
    try {
      // 1. Update application status
      const { error: appError } = await supabase
        .from('project_applications')
        .update({ status: 'accepted' })
        .eq('id', app.id);
        
      if (appError) throw appError;

      // 2. Assign provider to project and update status
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          provider_id: app.provider_id,
          status: 'active'
        })
        .eq('id', id);
        
      if (projectError) throw projectError;

      const providerName = app.provider?.company_name || app.provider?.display_name || 'Provider';
      const clientName = profile?.company_name || profile?.display_name || 'Client';

      const ndaContent = `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (this "Agreement") is made and entered into as of the date of electronic signature (the "Effective Date") by and between **OpsBridge**, a platform facilitating business operations and expansion ("Disclosing Party"), and **${providerName}**, an independent service provider utilizing the platform ("Receiving Party").

**1. PURPOSE OF DISCLOSURE**
The parties wish to explore a potential business relationship or transaction concerning operational support, expansion services, and project execution (the "Purpose"). In connection with the Purpose, the Disclosing Party may disclose to the Receiving Party certain confidential, proprietary, or trade secret information. This Agreement is intended to allow the parties to engage in candid discussions while fully protecting the confidentiality of such information.

**2. DEFINITION OF CONFIDENTIAL INFORMATION**
"Confidential Information" means any and all non-public, proprietary, or confidential information disclosed by the Disclosing Party to the Receiving Party, whether disclosed orally, in writing, visually, or electronically. This includes, but is not limited to: business plans, financial models, client lists, customer data, intellectual property, technical specifications, operational workflows, software code, algorithms, pricing structures, marketing strategies, and any information related to the Disclosing Party's clients or end-users. Confidential Information also includes any analyses, compilations, studies, or other documents prepared by the Receiving Party that contain or reflect such information.

**3. EXCLUSIONS FROM CONFIDENTIAL INFORMATION**
The obligations of confidentiality shall not apply to any information that: 
(a) was already known to the Receiving Party at the time of disclosure without an obligation of confidentiality; 
(b) is or becomes publicly known through no wrongful act or breach of this Agreement by the Receiving Party; 
(c) is rightfully received by the Receiving Party from a third party without restriction on disclosure and without breach of a non-disclosure obligation; or 
(d) is independently developed by the Receiving Party without the use of or reference to the Disclosing Party's Confidential Information, as evidenced by written records.

**4. OBLIGATIONS OF RECEIVING PARTY**
The Receiving Party agrees to: 
(a) hold the Confidential Information in the strictest confidence and take all reasonable precautions to protect such information (which precautions shall be no less than those employed by the Receiving Party to protect its own confidential information); 
(b) not disclose any Confidential Information to any third party without the prior written consent of the Disclosing Party; 
(c) not use any Confidential Information for any purpose whatsoever other than the Purpose explicitly stated in this Agreement; and 
(d) restrict access to the Confidential Information solely to its employees, officers, or advisors who have a strict "need to know" in order to fulfill the Purpose, provided that such individuals are bound by confidentiality obligations at least as restrictive as those contained herein.

**5. COMPELLED DISCLOSURE**
If the Receiving Party is compelled by law, regulation, or a valid order of a court or other governmental authority to disclose any Confidential Information, the Receiving Party shall promptly notify the Disclosing Party in writing prior to making any such disclosure. This notice must be provided in sufficient time to allow the Disclosing Party to seek a protective order or other appropriate remedy. If such protective order is not obtained, the Receiving Party may disclose only that portion of the Confidential Information that is legally required and shall exercise reasonable efforts to obtain reliable assurance that confidential treatment will be accorded to the information disclosed.

**6. RETURN OR DESTRUCTION OF MATERIALS**
Upon the written request of the Disclosing Party, or upon the termination of the business relationship or the Purpose, the Receiving Party shall promptly return or safely destroy all documents, digital files, and other tangible materials representing the Confidential Information and all copies thereof. Upon request, the Receiving Party shall provide written certification of such destruction.

**7. NO LICENSE OR OWNERSHIP**
Nothing in this Agreement is intended to grant any rights to the Receiving Party under any patent, mask work right, copyright, trade secret, or other intellectual property right of the Disclosing Party. All Confidential Information shall remain the sole and exclusive property of the Disclosing Party.

**8. NO OBLIGATION TO PROCEED**
Nothing herein shall obligate either party to proceed with any transaction between them, and each party reserves the right, in its sole discretion, to terminate the discussions contemplated by this Agreement concerning the Purpose.

**9. TERM AND TERMINATION**
This Agreement shall govern all communications between the parties. The Receiving Party's obligations under this Agreement shall survive the termination of the parties' business relationship and shall continue for a period of five (5) years from the date of the last disclosure of Confidential Information, except with respect to trade secrets, which shall remain confidential indefinitely as long as they maintain their status as trade secrets under applicable law.

**10. REMEDIES**
The Receiving Party acknowledges that unauthorized disclosure or use of Confidential Information could cause irreparable harm and significant injury to the Disclosing Party, which may be difficult to ascertain. Accordingly, the Receiving Party agrees that the Disclosing Party shall have the right to seek an immediate injunction enjoining any breach or threatened breach of this Agreement, in addition to any other rights and remedies available at law or in equity.

**11. MISCELLANEOUS**
This Agreement constitutes the entire understanding between the parties concerning the subject matter hereof and supersedes all prior discussions, agreements, and representations. This Agreement may not be amended except in a writing signed by both parties. If any provision of this Agreement is found to be unenforceable, the remainder shall be enforced as fully as possible, and the unenforceable provision shall be deemed modified to the limited extent required to permit its enforcement.

IN WITNESS WHEREOF, the parties have executed this Non-Disclosure Agreement by their electronic signature through the OpsBridge platform.`;

      const mouContent = `# MEMORANDUM OF UNDERSTANDING & SERVICE LEVEL AGREEMENT

This Memorandum of Understanding (this "MOU") is made effective as of the date of electronic signature by and between **${clientName}** (hereinafter referred to as the "Client") and **${providerName}** (hereinafter referred to as the "Provider").

**1. BACKGROUND AND CONTEXT**
The Client has posted a requirement for operational expansion, services, or support on the OpsBridge platform under the project titled **"${project.title}"** (the "Project"). The Provider has submitted a formal application and proposal to fulfill these requirements, which the Client has formally accepted. This MOU serves to establish the foundational terms, responsibilities, and operational framework under which the Provider will execute the Project.

**2. STATEMENT OF INTENT**
The primary objective of this MOU is to create a collaborative and transparent working relationship between the Client and the Provider. Both parties commit to communicating openly, acting in good faith, and actively working towards the successful completion of the Project as defined by the agreed-upon Scope of Work.

**3. SCOPE OF SERVICES**
The Provider agrees to dedicate the necessary time, resources, expertise, and personnel to execute the tasks outlined in the Project's Scope of Work (SOW). The Provider commits to delivering high-quality results that meet or exceed industry standards and align with the specific operational goals stipulated by the Client during the project briefing phase.

**4. CLIENT RESPONSIBILITIES**
To facilitate the successful execution of the Project, the Client agrees to:
(a) Provide timely access to all necessary information, documentation, and internal resources required by the Provider.
(b) Assign a primary point of contact who possesses the authority to make decisions, provide approvals, and offer feedback on behalf of the Client.
(c) Review deliverables and provide constructive, actionable feedback within the timeframes established in the Project schedule.
(d) Ensure timely scheduling and processing of payments through the OpsBridge platform upon the completion of agreed-upon milestones or deliverables.

**5. PROVIDER RESPONSIBILITIES**
In executing the Project, the Provider agrees to:
(a) Perform all services professionally, diligently, and in a workmanlike manner, utilizing suitably qualified personnel.
(b) Maintain regular communication with the Client, providing status updates, milestone reports, and immediate notification of any anticipated delays or operational blockers.
(c) Comply with all applicable local, state, and federal laws and regulations pertinent to the execution of the services.
(d) Actively manage and update task statuses within the OpsBridge platform to ensure the Client has real-time visibility into project progress.

**6. MILESTONES AND DELIVERABLES**
The specific milestones, deliverables, and timelines will be managed dynamically via the 'Tasks' interface within the OpsBridge platform. Both parties agree that the creation, modification, and completion of tasks within the platform represent the binding operational timeline for the Project.

**7. FINANCIAL ARRANGEMENTS**
Compensation for the services rendered under this MOU shall be governed by the budget outlined in the Project brief and finalized through the payment schedules set up by the Client on the OpsBridge platform. The Provider acknowledges that OpsBridge acts as the intermediary for payment processing and agrees to the platform's terms regarding fund disbursement and settlement timelines.

**8. INTELLECTUAL PROPERTY**
Unless otherwise explicitly agreed upon in a separate, written contract, all work product, deliverables, data, and intellectual property generated by the Provider specifically for the Client during the course of the Project shall become the sole and exclusive property of the Client upon the full payment of associated invoices.

**9. DISPUTE RESOLUTION**
In the event of a dispute, disagreement, or claim arising out of or relating to this MOU or the execution of the Project, the parties agree to first attempt to resolve the matter amicably through direct, good-faith negotiations. If the dispute cannot be resolved within thirty (30) days of written notice, the parties may escalate the issue to OpsBridge platform administration for mediation before seeking formal legal remedies.

**10. MODIFICATION AND TERMINATION**
This MOU may be amended, modified, or supplemented only by a written mutual agreement executed by both the Client and the Provider. Either party may terminate this MOU and the associated Project engagement by providing written notice to the other party via the platform's messaging system, subject to the settlement of any outstanding payments for work already completed.

**11. LEGAL STATUS**
While this MOU serves as a strong statement of operational intent and professional commitment, the parties acknowledge that it is designed to facilitate collaboration on the OpsBridge platform. Specific legal liabilities and indemnifications, where required beyond the scope of this document, should be addressed in independent contractual agreements between the Client and the Provider.

IN WITNESS WHEREOF, the Client and the Provider have executed this Memorandum of Understanding by their electronic signatures through the OpsBridge platform.`;

      const { error: agreementsError } = await supabase
        .from('agreements')
        .insert([
          {
            project_id: id,
            client_id: profile.id,
            provider_id: app.provider_id,
            type: 'nda',
            content: ndaContent,
            status: 'pending'
          },
          {
            project_id: id,
            client_id: profile.id,
            provider_id: app.provider_id,
            type: 'mou',
            content: mouContent,
            status: 'pending'
          }
        ]);

      if (agreementsError) throw agreementsError;

      // 4. Reject other pending applications
      const { error: rejectError } = await supabase
        .from('project_applications')
        .update({ status: 'rejected' })
        .eq('project_id', id)
        .eq('status', 'pending');

      if (rejectError) throw rejectError;

      // 4. Trigger notification for accepted provider
      await supabase.from('notifications').insert([
        {
          user_id: app.provider_id,
          title: 'Project Application Accepted',
          message: `Your application for "${project.title}" has been accepted. You are now assigned to this project.`,
          read: false
        }
      ]);

      // 5. Notify other applicants (optional but good practice)
      const otherApplicants = applications.filter(a => a.id !== app.id && a.status === 'pending');
      const notifications = otherApplicants.map(applicant => ({
        user_id: applicant.provider_id,
        title: 'Project Update',
        message: `The project "${project.title}" you applied for has been assigned to another provider.`,
        read: false
      }));
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
      
      toast.success("Application accepted and provider assigned!");
      
      // Re-fetch project and apps to update UI
      const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).single();
      if (projectData) setProject(projectData);
      
      const { data: appsData } = await supabase.from('project_applications').select('*, provider:profiles!project_applications_provider_id_fkey(display_name, company_name, photo_url)').eq('project_id', id);
      if (appsData) setApplications(appsData);

    } catch (error) {
      console.error('Error accepting application:', error);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!project) return null;

  const userHasApplied = applications.some(app => app.provider_id === profile?.id);
  const isOwner = project.client_id === profile?.id;
  const isAssignedProvider = project.provider_id === profile?.id;

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-4">
              <div className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                project.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                project.status === 'in-review' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                project.status === 'open' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-muted text-muted-foreground border-border"
              )}>
                {project.status.replace('-', ' ')}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Project Info */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4 tracking-tight">{project.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Calendar className="h-4 w-4 text-primary" />
                  {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recently created'}
                </div>
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Budget: <span className="text-foreground font-bold">{project.value || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Project
                </div>
              </div>
            </section>

            <Card className="p-0 border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  Project Description & Scope
                </h2>
              </div>
              <div className="p-8 prose prose-stone max-w-none text-sm dark:prose-invert prose-headings:font-bold prose-headings:mt-6 prose-p:my-2 prose-ul:my-2 prose-li:my-0 prose-ul:list-disc prose-ol:list-decimal">
                <Markdown remarkPlugins={[remarkGfm]}>{project.sow}</Markdown>
              </div>
            </Card>

            {isOwner && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Applications
                    <span className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5 rounded-full ml-2">
                      {applications.length}
                    </span>
                  </h2>
                </div>
                
                <div className="grid gap-4">
                  {applications.length === 0 ? (
                    <Card className="py-16 text-center text-muted-foreground text-sm border border-border bg-card/50 rounded-2xl border-dashed">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium">No applications yet.</p>
                      <p className="text-xs mt-1">Providers will appear here once they apply.</p>
                    </Card>
                  ) : (
                    applications.map((app) => (
                      <Card key={app.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-6 border border-border bg-card rounded-2xl gap-4 shadow-sm hover:border-primary/30 transition-colors group">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {app.provider?.photo_url ? (
                            <img src={app.provider.photo_url} alt="Provider Avatar" className="h-12 w-12 rounded-xl object-cover shrink-0 border border-border" />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                              <Users className="h-6 w-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-foreground text-base">
                              {app.provider?.display_name || app.provider?.email || `Provider #${app.provider_id.slice(0, 5)}`}
                            </div>
                            {app.provider?.company_name && (
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                                {app.provider.company_name}
                              </div>
                            )}
                            {app.message ? (
                              <div className="mt-3 bg-muted/30 p-5 rounded-xl border border-border prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:mt-4 prose-p:my-2 prose-ul:my-2 prose-li:my-0 prose-ul:list-disc prose-ol:list-decimal">
                                <Markdown remarkPlugins={[remarkGfm]}>{app.message}</Markdown>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground mt-3 bg-muted/30 p-3 rounded-xl border border-border leading-relaxed italic">
                                No additional message provided.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <div className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                            app.status === 'accepted' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                            app.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200"
                          )}>
                            {app.status}
                          </div>
                          {isOwner && app.status === 'pending' && (project.status === 'in-review' || project.status === 'open') && (
                            <Button size="sm" className="h-9 px-5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={() => handleAcceptApplication(app)}>
                              Accept Proposal
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {profile?.role === 'provider' && profile.is_verified && !isOwner && project.status === 'open' && (
              <Card className="p-0 sticky top-24 border border-border rounded-2xl bg-card overflow-hidden shadow-md">
                <div className="bg-primary p-6 text-primary-foreground">
                   <h3 className="text-xl font-bold mb-1">Apply for Project</h3>
                   <p className="text-primary-foreground/80 text-sm font-medium">Submit your proposal to the client.</p>
                </div>
                <div className="p-6">
                  {userHasApplied ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border-4 border-emerald-100">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-lg">Proposal Submitted</div>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">The client is reviewing your application. You'll be notified of any updates.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleApply} className="space-y-5">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Your Proposal Message
                        </label>
                        <div data-color-mode="light" className="rounded-xl overflow-hidden border border-border">
                          <MDEditor
                            value={message}
                            onChange={(v) => setMessage(v || '')}
                            height={300}
                            preview="edit"
                            textareaProps={{
                              placeholder: "Explain why your business is the perfect fit for this project. Format your proposal with bullet points, headings, or bold text..."
                            }}
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full gap-2 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-sm transition-all active:scale-95" disabled={applying || !message.trim()}>
                        {applying ? <Clock className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        {applying ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            )}

            {isOwner && (
              <Card className="p-0 bg-card border border-border rounded-2xl sticky top-24 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-muted/20">
                  <h3 className="text-lg font-bold text-foreground">Project Controls</h3>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Status</span>
                    <span className={cn(
                      "font-bold uppercase tracking-wider text-[10px] px-2 py-1 rounded-md border",
                      project.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                      project.status === 'in-review' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                      project.status === 'open' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-muted text-muted-foreground border-border"
                    )}>{project.status.replace('-', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Applications Received</span>
                    <span className="font-bold text-foreground text-base bg-muted px-2 py-0.5 rounded-md">{applications.length}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted rounded-xl h-11 text-sm font-semibold transition-colors">
                      Edit Project Details
                    </Button>
                    <Button variant="destructive" className="w-full rounded-xl h-11 text-sm font-semibold shadow-sm transition-all active:scale-95">
                      Close Project
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!profile?.is_verified && profile?.role === 'provider' && (
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-amber-900 mb-1">Vetting Required</h4>
                    <p className="text-sm text-amber-700 font-medium leading-relaxed">
                      You must complete your business verification process before you can submit proposals for high-value projects.
                    </p>
                    <Link to="/vetting" className="inline-block mt-4 w-full">
                      <Button className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95">
                        Complete Vetting Process
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
