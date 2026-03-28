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
import { cn } from '@/lib/utils';

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
          .select('*')
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
            .select('*')
            .eq('project_id', id)
            .then(({ data }) => {
              if (data) setApplications(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;

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
    } catch (error) {
      console.error('Error applying for project:', error);
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

      // 3. Trigger notification for provider
      await supabase.from('notifications').insert([
        {
          user_id: app.provider_id,
          title: 'Project Application Accepted',
          message: `Your application for "${project.title}" has been accepted. You are now assigned to this project.`,
          read: false
        }
      ]);
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
              <div className="p-8 prose prose-stone max-w-none text-sm dark:prose-invert">
                <Markdown>{project.sow}</Markdown>
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
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                            <Users className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-foreground text-base">Provider #{app.provider_id.slice(0, 5)}</div>
                            <div className="text-sm text-muted-foreground mt-2 bg-muted/30 p-3 rounded-xl border border-border leading-relaxed">
                              {app.message}
                            </div>
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
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Your Proposal Message
                        </label>
                        <textarea
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Explain why your business is the perfect fit for this expansion project..."
                          className="w-full h-40 rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y transition-all"
                        />
                      </div>
                      <Button type="submit" className="w-full gap-2 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-sm transition-all active:scale-95" disabled={applying}>
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
