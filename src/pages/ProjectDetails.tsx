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
      <nav className="sticky top-0 z-10 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-4">
              <div className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border",
                project.status === 'active' ? "bg-background text-muted-foreground border-border" : 
                project.status === 'in-review' ? "bg-background text-muted-foreground border-border" : "bg-background text-muted-foreground border-border"
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
              <h1 className="text-3xl font-bold text-foreground mb-4">{project.title}</h1>
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recently created'}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget: {project.value || 'TBD'}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Project
                </div>
              </div>
            </section>

            <Card className="p-8 border border-border  bg-white rounded-xl">
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Project Description
              </h2>
              <div className="prose prose-zinc max-w-none text-sm">
                <Markdown>{project.sow}</Markdown>
              </div>
            </Card>

            {isOwner && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Applications ({applications.length})
                </h2>
                <div className="grid gap-4">
                  {applications.length === 0 ? (
                    <Card className="py-12 text-center text-muted-foreground text-sm border border-border  rounded-xl">
                      No applications yet.
                    </Card>
                  ) : (
                    applications.map((app) => (
                      <Card key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-border  bg-white rounded-xl gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-muted-foreground border border-border shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">Provider #{app.provider_id.slice(0, 5)}</div>
                            <div className="text-xs text-muted-foreground mt-1">{app.message}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                            app.status === 'accepted' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                            app.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200"
                          )}>
                            {app.status}
                          </div>
                          {isOwner && app.status === 'pending' && project.status === 'in-review' && (
                            <Button size="sm" className="h-8 px-4 text-xs bg-primary text-primary-foreground hover:bg-zinc-800" onClick={() => handleAcceptApplication(app)}>Accept</Button>
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
            {profile?.role === 'provider' && profile.is_verified && !isOwner && (
              <Card className="p-6 sticky top-24 border border-border  rounded-xl bg-white">
                <h3 className="text-base font-bold text-foreground mb-4">Apply for Project</h3>
                {userHasApplied ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">Application Submitted</div>
                      <p className="text-xs text-muted-foreground mt-1">The client is reviewing your proposal.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Your Proposal
                      </label>
                      <textarea
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Explain why you're a good fit..."
                        className="w-full h-32 rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300 resize-none"
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-zinc-800" disabled={applying}>
                      {applying ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit Application
                    </Button>
                  </form>
                )}
              </Card>
            )}

            {isOwner && (
              <Card className="p-6 bg-white border border-border  rounded-xl sticky top-24">
                <h3 className="text-base font-bold text-foreground mb-4">Project Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize text-foreground">{project.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Applications</span>
                    <span className="font-medium text-foreground">{applications.length}</span>
                  </div>
                  <div className="h-px bg-muted my-4" />
                  <Button variant="outline" className="w-full border-border text-zinc-700 hover:bg-background rounded-lg h-10 text-sm">
                    Edit Project
                  </Button>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-zinc-800 rounded-lg h-10 text-sm">
                    Close Project
                  </Button>
                </div>
              </Card>
            )}

            {!profile?.is_verified && profile?.role === 'provider' && (
              <Card className="p-6 bg-amber-50 border border-amber-200  rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Vetting Required</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      You must be verified to apply for projects.
                    </p>
                    <Link to="/vetting">
                      <Button size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700 text-primary-foreground rounded-lg px-4 border-none text-xs">
                        Complete Vetting
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
