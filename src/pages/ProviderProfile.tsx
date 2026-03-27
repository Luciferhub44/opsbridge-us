import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Building2, 
  CheckCircle2,
  Clock,
  MessageSquare,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '../lib/supabase';
import MessagingSystem from '../components/messaging/MessagingSystem';

export function ProviderProfileContent({ 
  provider, 
  completedProjects, 
  onConnect,
  vettingData
}: { 
  provider: any, 
  completedProjects: any[], 
  onConnect?: () => void,
  vettingData?: any
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Profile Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 border-none shadow-sm bg-white rounded-[2rem]">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-[1.5rem] bg-background flex items-center justify-center text-muted-foreground border-4 border-white shadow-xl">
                  {provider.photo_url ? (
                    <img src={provider.photo_url} alt="" className="h-full w-full object-cover rounded-[1.5rem]" />
                  ) : (
                    <Building2 className="h-12 w-12" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-black text-foreground tracking-tighter">{provider.display_name || provider.email}</h1>
                    {provider.is_verified && <ShieldCheck className="h-6 w-6 text-emerald-500" />}
                  </div>
                  <p className="text-muted-foreground font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {provider.location || 'United States'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1 text-xl font-black text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                  {provider.rating || '5.0'}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Verified Provider</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 py-8 border-y border-border">
              <div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Industry</div>
                <div className="font-black text-foreground">{provider.industry || 'General Operations'}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Completed</div>
                <div className="font-black text-foreground">{completedProjects.length} Projects</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Member Since</div>
                <div className="font-black text-foreground">2026</div>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-lg font-black text-foreground mb-4 tracking-tight">About</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  {provider.bio || `${provider.display_name || 'This provider'} is a verified US business owner specializing in ${provider.industry || 'operational excellence'}. They have a proven track record of helping international companies scale their US presence through strategic supply chain management and regulatory compliance.`}
                </p>
              </div>

              {vettingData && (
                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-black text-foreground mb-4 tracking-tight">Operational Details</h3>
                  <div className="bg-background p-6 rounded-2xl border border-border">
                    <p className="text-muted-foreground leading-relaxed font-medium">
                      {vettingData.operational_details}
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">EIN: {vettingData.ein}</div>
                      <div className="h-1 w-1 rounded-full bg-border" />
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status: {vettingData.status}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <section className="space-y-6">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2 tracking-tight">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              Completed Projects
            </h2>
            <div className="grid gap-4">
              {completedProjects.length === 0 ? (
                <Card className="py-12 text-center text-muted-foreground font-black uppercase tracking-widest text-xs italic bg-white border-none shadow-sm rounded-[2rem]">
                  No completed projects listed yet.
                </Card>
              ) : (
                completedProjects.map((project) => (
                  <Card key={project.id} className="p-8 border-none shadow-sm bg-white rounded-[2rem] hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-foreground text-lg tracking-tight">{project.title}</h4>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          Completed on {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 className="h-3 w-3" />
                        Success
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">
          <Card className="p-8 sticky top-24 border-none shadow-xl bg-white rounded-[2rem]">
            <h3 className="text-xl font-black text-foreground mb-4 tracking-tight">Contact Provider</h3>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed font-medium">
              Interested in working with {provider.display_name || 'this provider'}? Send them a message to discuss your US operational needs.
            </p>
            <div className="space-y-4">
              <Button 
                onClick={onConnect}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-zinc-900/10 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Send Message
              </Button>
              <Button variant="outline" className="w-full h-14 rounded-2xl border-border hover:border-zinc-900 transition-all font-black text-[10px] uppercase tracking-widest">
                Request Quote
              </Button>
            </div>
            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <Clock className="h-4 w-4" />
                Average response time: 4 hours
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-primary text-primary-foreground border-none rounded-[2rem] shadow-2xl shadow-zinc-900/20">
            <h3 className="text-xl font-black mb-6 tracking-tight">Compliance Check</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-widest">D&B Verified</div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">DUNS: 12-345-6789</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-widest">EIN Confirmed</div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Verified by OpsBridge</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProviderProfile() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [selectedProviderForMessage, setSelectedProviderForMessage] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProviderData = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        setProvider(profileData);

        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('provider_id', id)
          .eq('status', 'completed');

        if (!projectsError && projectsData) {
          setCompletedProjects(projectsData);
        }
      } catch (error) {
        console.error("Error fetching provider data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();

    const channel = supabase
      .channel(`provider_projects_${id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'projects',
          filter: `provider_id=eq.${id}`
        }, 
        () => {
          supabase
            .from('projects')
            .select('*')
            .eq('provider_id', id)
            .eq('status', 'completed')
            .then(({ data }) => {
              if (data) setCompletedProjects(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!provider) return <div className="flex h-screen items-center justify-center">Provider not found.</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-10 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <ProviderProfileContent 
          provider={provider} 
          completedProjects={completedProjects} 
          onConnect={() => setSelectedProviderForMessage(provider)}
        />
      </main>

      {/* Messaging Modal */}
      {selectedProviderForMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl">
            <MessagingSystem 
              recipientId={selectedProviderForMessage.id} 
              recipientName={selectedProviderForMessage.display_name || selectedProviderForMessage.email}
              onClose={() => setSelectedProviderForMessage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
