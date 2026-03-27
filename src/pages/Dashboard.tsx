import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  X,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import Documents from '@/components/dashboard/Documents';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ProviderOnboarding from '@/components/onboarding/ProviderOnboarding';
import { Input } from '@/components/ui/input';
import MessagingSystem from '@/components/messaging/MessagingSystem';
import { ProviderProfileContent } from './ProviderProfile';

export default function Dashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<any[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    return localStorage.getItem('onboarding_dismissed') === 'true';
  });
  const [selectedProviderForProfile, setSelectedProviderForProfile] = useState<any>(null);
  const [selectedProviderForMessage, setSelectedProviderForMessage] = useState<any>(null);
  const [completedProjectsForProfile, setCompletedProjectsForProfile] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [errorModal, setErrorModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });
  const [settingsForm, setSettingsForm] = useState({
    displayName: '',
    companyName: '',
    industry: '',
    location: '',
    bio: ''
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettingsForm({
        displayName: profile.display_name || '',
        companyName: profile.company_name || '',
        industry: profile.industry || '',
        location: profile.location || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: settingsForm.displayName,
          company_name: settingsForm.companyName,
          industry: settingsForm.industry,
          location: settingsForm.location,
          bio: settingsForm.bio
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Settings updated successfully!');
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error('Failed to update settings');
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const [providers, setProviders] = useState<any[]>([]);
  const [vettingApps, setVettingApps] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    title: '',
    needs: '',
    value: '',
    status: 'active'
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !profile) return;

    const fetchProjects = async () => {
      let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (profile.role !== 'admin') {
        query = query.in('status', ['active', 'in-review']);
      }
      const { data } = await query;
      if (data) setProjects(data);
    };

    fetchProjects();

    const fetchAdminData = async () => {
      if (profile.role === 'admin') {
        const { data: vettingData } = await supabase.from('vetting_applications').select('*');
        if (vettingData) setVettingApps(vettingData);

        const { data: usersData } = await supabase.from('profiles').select('*');
        if (usersData) {
          setAllUsers(usersData);
          setProviders(usersData.filter(u => u.role === 'provider'));
        }
      }
    };

    fetchAdminData();

    // Set up basic polling or rely on manual refresh for non-critical lists for simplicity in this refactor
    // Realtime can be added here if needed, similar to notifications.
    const interval = setInterval(() => {
      fetchProjects();
      if (profile.role === 'admin') fetchAdminData();
    }, 15000);

    return () => clearInterval(interval);

  }, [profile, authLoading]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleApproveVetting = async (app: any) => {
    try {
      await supabase.from('vetting_applications').update({ status: 'approved' }).eq('id', app.id);
      await supabase.from('profiles').update({ role: 'provider', is_verified: true }).eq('id', app.provider_id);
      
      await supabase.from('notifications').insert([{
        user_id: app.provider_id,
        title: 'Vetting Approved',
        message: 'Your business profile has been verified. You can now apply for projects.',
        read: false
      }]);

      setVettingApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      toast.success('Vetting approved successfully.');
    } catch (error) {
      console.error("Error approving vetting:", error);
      toast.error('Failed to approve vetting.');
    }
  };

  const handleRejectVetting = async (app: any) => {
    try {
      await supabase.from('vetting_applications').update({ status: 'rejected' }).eq('id', app.id);
      
      await supabase.from('notifications').insert([{
        user_id: app.provider_id,
        title: 'Vetting Update',
        message: 'Your vetting application requires more information or was rejected.',
        read: false
      }]);

      setVettingApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a));
      toast.success('Vetting rejected.');
    } catch (error) {
      console.error("Error rejecting vetting:", error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    try {
      if (editingProject) {
        await supabase.from('projects').update({
          title: newProject.title,
          needs: newProject.needs,
          value: newProject.value,
          status: newProject.status
        }).eq('id', editingProject.id);
        toast.success("Project updated successfully.");
        setEditingProject(null);
      } else {
        await supabase.from('projects').insert([{
          title: newProject.title,
          needs: newProject.needs,
          value: newProject.value,
          status: newProject.status,
          client_id: profile.id
        }]);

        await supabase.from('notifications').insert([{
          user_id: profile.id,
          title: 'Project Created',
          message: `Your project "${newProject.title}" has been successfully broadcasted.`,
          read: false
        }]);

        toast.success("Project broadcasted successfully.");
      }
      setIsCreatingProject(false);
      setNewProject({ title: '', needs: '', value: '', status: 'active' });
      
      // Manually trigger refresh
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (data) setProjects(data);

    } catch (error) {
      console.error("Error saving project:", error);
      toast.error('Failed to save project.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project?',
      onConfirm: async () => {
        try {
          await supabase.from('projects').delete().eq('id', projectId);
          setProjects(prev => prev.filter(p => p.id !== projectId));
          setConfirmModal(prev => ({ ...prev, show: false }));
          toast.success("Project deleted.");
        } catch (error) {
          console.error("Error deleting project:", error);
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (profile?.role !== 'admin') return;
    if (userId === profile.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Delete User',
      message: 'Are you sure you want to permanently delete this user? This action cannot be undone.',
      onConfirm: async () => {
        try {
          // In Supabase, deleting from the profiles table might be enough if cascading deletes are set up, 
          // or at least it removes them from the app. Truly deleting an auth user requires an Edge Function.
          await supabase.from('profiles').delete().eq('id', userId);
          setAllUsers(prev => prev.filter(u => u.id !== userId));
          setProviders(prev => prev.filter(p => p.id !== userId));
          toast.success("User profile deleted.");
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (error) {
          console.error("Error deleting user:", error);
        }
      }
    });
  };

  const startEditingProject = (project: any) => {
    setEditingProject(project);
    setNewProject({
      title: project.title,
      needs: project.needs,
      value: project.value,
      status: project.status
    });
    setIsCreatingProject(true);
  };

  const handleDeleteAccount = async () => {
    setConfirmModal({
      show: true,
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action is permanent and will remove all your data.',
      onConfirm: async () => {
        try {
          if (!profile) return;
          await supabase.from('profiles').delete().eq('id', profile.id);
          await supabase.auth.signOut();
          
          setConfirmModal(prev => ({ ...prev, show: false }));
          navigate('/');
        } catch (error) {
          console.error("Error deleting account:", error);
          setConfirmModal(prev => ({ ...prev, show: false }));
          setErrorModal({
            show: true,
            title: 'Deletion Failed',
            message: 'Failed to delete account. Please contact support.'
          });
        }
      }
    });
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('User role updated.');
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const handleToggleUserVerification = async (userId: string, currentStatus: boolean) => {
    try {
      await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', userId);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
      toast.success('User verification status updated.');
    } catch (error) {
      console.error("Error updating user verification:", error);
    }
  };

  const handleViewProfile = async (provider: any) => {
    setLoadingProfile(true);
    setSelectedProviderForProfile(provider);
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('status', 'completed');
      
      if (data) setCompletedProjectsForProfile(data);
    } catch (error) {
      console.error("Error fetching completed projects:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleDismissOnboarding = () => {
    setOnboardingDismissed(true);
    localStorage.setItem('onboarding_dismissed', 'true');
  };

  const handleResumeOnboarding = () => {
    setOnboardingDismissed(false);
    localStorage.removeItem('onboarding_dismissed');
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!profile) return <div className="flex h-screen items-center justify-center">Please log in.</div>;

  return (
    <div className="flex min-h-screen bg-background">
      {profile?.role === 'provider' && !profile.onboarding_completed && !onboardingDismissed && (
        <ProviderOnboarding user={profile} onComplete={handleDismissOnboarding} />
      )}
      <aside className="w-72 border-r border-border bg-white flex flex-col h-screen sticky top-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl ">O</div>
            <span className="text-2xl font-bold tracking-tighter text-foreground">OpsBridge</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { id: 'projects', label: 'Projects', icon: Briefcase },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              profile?.role === 'admin' && { id: 'providers', label: 'Providers', icon: Users },
              { id: 'documents', label: 'Documents', icon: ShieldCheck },
              { id: 'settings', label: 'Settings', icon: Settings },
              profile?.role === 'admin' && { id: 'admin', label: 'Admin', icon: ShieldCheck },
            ].filter(Boolean).map((item: any) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === item.id 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-foreground" : "text-muted-foreground")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border border-border">
              {profile.photo_url ? <img src={profile.photo_url} alt="" className="h-full w-full object-cover" /> : profile.display_name?.charAt(0) || profile.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{profile.display_name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{profile.role}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Welcome back, {profile.display_name || profile.email}</h1>
              {profile.role === 'admin' && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border uppercase tracking-wider">Admin</span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your projects and network connections.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="h-10 w-64 rounded-lg border border-border bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all"
              />
            </div>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg bg-white p-2 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border-2 border-white"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute top-20 right-8 w-80 bg-white rounded-xl  border border-border z-50 overflow-hidden">
                <div className="p-3 border-b border-border flex items-center justify-between bg-background">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs">No notifications.</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markNotificationRead(n.id)}
                        className={cn(
                          "p-4 border-b border-zinc-50 cursor-pointer hover:bg-muted transition-colors",
                          !n.read && "bg-blue-50/50"
                        )}
                      >
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {profile.role === 'client' && (
              <Link to="/brief-builder">
                <Button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-zinc-800 text-sm font-medium">
                  <Plus className="h-4 w-4 mr-2" /> New Project
                </Button>
              </Link>
            )}
          </div>
        </header>

        {profile?.role === 'provider' && !profile.onboarding_completed && onboardingDismissed && (
          <div className="mb-8 p-6 bg-background border border-border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Finish your profile</h3>
                <p className="text-muted-foreground text-sm">Complete your profile to start receiving project invitations.</p>
              </div>
            </div>
            <Button 
              onClick={handleResumeOnboarding}
              variant="outline"
              className="rounded-lg h-10 px-6 font-semibold text-sm border-border hover:bg-muted"
            >
              Resume Onboarding
            </Button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: Briefcase, color: 'zinc' },
                profile.role === 'admin' && { label: 'Total Providers', value: providers.length, icon: Users, color: 'zinc' },
                { label: 'Account Status', value: profile.is_verified ? 'Verified' : 'Pending', icon: ShieldCheck, color: profile.is_verified ? 'zinc' : 'zinc' }
              ].filter(Boolean).map((stat: any, i) => (
                <Card key={i} className="p-6 border border-border  bg-white rounded-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center text-muted-foreground border border-border">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Card className="p-0 overflow-hidden border border-border  bg-white rounded-xl">
                <div className="border-b border-border bg-white px-6 py-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Recent Activity</h3>
                  <Button variant="ghost" size="sm" className="text-xs font-medium text-muted-foreground hover:text-foreground">View All</Button>
                </div>
                <div className="p-6 space-y-6">
                  {projects.slice(0, 5).map((project, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0 border border-border text-muted-foreground">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div className="flex-1 border-b border-zinc-50 pb-6 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-foreground">
                            Project: <span className="text-muted-foreground font-medium">{project.title}</span>
                          </p>
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                            project.status === 'active' ? "bg-background text-muted-foreground border-border" : "bg-background text-muted-foreground border-border"
                          )}>
                            {project.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {project.created_at ? new Date(project.created_at).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm">No recent activity.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Projects</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Track and manage your project initiatives.</p>
              </div>
              {profile.role === 'client' && (
                <Link to="/brief-builder">
                  <Button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-zinc-800 text-sm font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Active', value: projects.filter(p => p.status === 'active').length, icon: Briefcase, color: 'zinc' },
                { label: 'In Review', value: projects.filter(p => p.status === 'in-review').length, icon: Clock, color: 'zinc' },
                { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, icon: CheckCircle2, color: 'zinc' },
              ].map((stat, i) => (
                <Card key={i} className="p-6 border border-border  bg-white rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-0 overflow-hidden border border-border  bg-white rounded-xl">
              <div className="divide-y divide-zinc-100">
                {projects.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center mx-auto mb-4 border border-border text-muted-foreground">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-bold text-foreground">No projects yet</h4>
                    <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                      {profile.role === 'client' ? 'Start your first project to begin your expansion.' : 'Projects will appear here once you are assigned.'}
                    </p>
                    {profile.role === 'client' && (
                      <Link to="/brief-builder" className="inline-block mt-6">
                        <Button variant="outline" className="h-10 px-6 rounded-lg text-sm font-medium border-border hover:bg-muted">Create a Project</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-base">{project.title}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.3 w-3.3" />
                              {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-zinc-300" />
                            <span className="text-xs font-medium text-muted-foreground">{project.value || 'Budget TBD'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        <div className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border",
                          project.status === 'active' ? "bg-background text-muted-foreground border-border" : 
                          project.status === 'in-review' ? "bg-background text-muted-foreground border-border" : "bg-background text-muted-foreground border-border"
                        )}>
                          {project.status.replace('-', ' ')}
                        </div>
                        <Link to={`/project/${project.id}`}>
                          <Button variant="outline" className="h-9 px-4 rounded-lg text-xs font-medium border-border hover:bg-muted">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Messages</h2>
              <p className="text-muted-foreground text-sm mt-0.5">Communicate with your network partners.</p>
            </div>
            <MessagingSystem />
          </div>
        )}

        {activeTab === 'documents' && (
          <Documents />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Settings</h2>
              <p className="text-muted-foreground text-sm mt-0.5">Manage your profile and account preferences.</p>
            </div>

            <Card className="p-6 border border-border  bg-white rounded-xl">
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Name</label>
                      <Input 
                        type="text" 
                        value={settingsForm.displayName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, displayName: e.target.value })}
                        className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-zinc-300 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Email</label>
                      <Input 
                        type="email" 
                        disabled
                        value={profile.email}
                        className="h-10 rounded-lg bg-background border-border text-muted-foreground text-sm opacity-70"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Company Name</label>
                      <Input 
                        type="text" 
                        value={settingsForm.companyName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                        className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-zinc-300 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Industry</label>
                      <select 
                        value={settingsForm.industry}
                        onChange={(e) => setSettingsForm({ ...settingsForm, industry: e.target.value })}
                        className="w-full h-10 rounded-lg bg-background border-border px-3 text-sm focus:ring-1 focus:ring-zinc-300 appearance-none border"
                      >
                        <option value="">Select Industry</option>
                        <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Retail & E-commerce">Retail & E-commerce</option>
                        <option value="Professional Services">Professional Services</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Bio</label>
                    <textarea 
                      value={settingsForm.bio}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                      className="w-full min-h-[100px] rounded-lg bg-background border-border border p-3 text-sm focus:ring-1 focus:ring-zinc-300 focus:outline-none"
                      placeholder="Tell us about your business..."
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <Button type="button" variant="outline" className="h-10 px-4 rounded-lg text-sm font-medium border-border hover:bg-muted">Cancel</Button>
                  <Button type="submit" className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-zinc-800">Save Changes</Button>
                </div>
              </form>
            </Card>

            <Card className="p-6 border border-rose-200  bg-rose-50/50 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-900 mb-1">Delete Account</h3>
                  <p className="text-sm text-rose-700 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  <Button 
                    variant="outline" 
                    className="h-9 px-4 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-rose-200"
                    onClick={handleDeleteAccount}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'providers' && profile?.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Providers</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Manage verified platform partners.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-10 px-4 rounded-lg text-sm font-medium border-border hover:bg-muted">Filter</Button>
                <Button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-zinc-800">Search</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-xl border border-border">
                  <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center mx-auto mb-4 border border-border text-muted-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">No providers found</h4>
                  <p className="text-muted-foreground text-sm mt-1">Verified partners will appear here.</p>
                </div>
              ) : (
                providers.map((provider) => (
                  <Card key={provider.id} className="p-6 border border-border  bg-white rounded-xl flex flex-col">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden border border-border">
                        {provider.photo_url ? <img src={provider.photo_url} alt="" className="h-full w-full object-cover" /> : <Users className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-foreground text-base truncate">
                          {provider.display_name || provider.email}
                          {provider.is_verified && <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="text-sm text-muted-foreground truncate mt-0.5">{provider.industry || 'General Operations'}</div>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 shrink-0">
                        ★ {provider.rating || '5.0'}
                      </div>
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed Projects</span>
                        <span className="text-sm font-bold text-foreground">{provider.projectsCompleted || 0}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleViewProfile(provider)}
                          className="flex-1 h-9 rounded-lg border-border text-xs font-medium hover:bg-muted"
                        >
                          View Profile
                        </Button>
                        <Button 
                          onClick={() => setSelectedProviderForMessage(provider)}
                          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-zinc-800"
                        >
                          Message
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Manage users, projects, and platform settings.</p>
              </div>
              <Button 
                onClick={() => setIsCreatingProject(true)} 
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>

            {isCreatingProject && (
              <Card className="p-6 border border-border  bg-white rounded-xl relative">
                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => {
                    setIsCreatingProject(false);
                    setEditingProject(null);
                    setNewProject({ title: '', needs: '', value: '', status: 'active' });
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreateProject} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Project Title</label>
                      <Input 
                        required
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        placeholder="e.g. System Integration"
                        className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-zinc-300 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Budget</label>
                      <Input 
                        required
                        value={newProject.value}
                        onChange={(e) => setNewProject({ ...newProject, value: e.target.value })}
                        placeholder="e.g. $10,000"
                        className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-zinc-300 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Project Description</label>
                    <textarea 
                      required
                      className="w-full min-h-[150px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
                      value={newProject.needs}
                      onChange={(e) => setNewProject({ ...newProject, needs: e.target.value })}
                      placeholder="Describe the requirements and scope..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-zinc-800">
                      {editingProject ? 'Save Changes' : 'Create Project'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: allUsers.length, color: 'zinc', icon: Users },
                { label: 'Active Projects', value: projects.length, color: 'zinc', icon: Briefcase },
                { label: 'Pending Vetting', value: vettingApps.filter(a => a.status === 'pending').length, color: 'amber', icon: Clock },
                { label: 'Live Operations', value: projects.filter(p => p.status === 'active').length, color: 'emerald', icon: ShieldCheck },
              ].map((stat, i) => (
                <Card key={i} className={cn(
                  "p-10 border-none  transition-all duration-500 hover: group rounded-xl relative overflow-hidden",
                  stat.color === 'zinc' ? "bg-white" : 
                  stat.color === 'amber' ? "bg-amber-50/30" : "bg-emerald-50/30"
                )}>
                  <div className="flex items-center justify-between mb-8">
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500 ",
                      stat.color === 'zinc' ? "bg-background text-foreground group-hover:bg-primary group-hover:text-primary-foreground" :
                      stat.color === 'amber' ? "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-primary-foreground" :
                      "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-primary-foreground"
                    )}>
                      <stat.icon className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{stat.label}</div>
                  <div className={cn(
                    "text-6xl font-bold tracking-tighter",
                    stat.color === 'amber' ? "text-amber-600" : 
                    stat.color === 'emerald' ? "text-emerald-600" : "text-foreground"
                  )}>{stat.value}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <Card className="p-0 overflow-hidden border-none  bg-white rounded-xl border border-border">
                <div className="border-b border-border bg-white px-12 py-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-foreground tracking-tighter">Vetting Queue</h3>
                    <p className="text-sm text-muted-foreground mt-2">{vettingApps.length} pending requests</p>
                  </div>
                </div>
                <div className="divide-y divide-zinc-50">
                  {vettingApps.length === 0 ? (
                    <div className="px-12 py-32 text-center">
                      <div className="h-24 w-24 rounded-full bg-background flex items-center justify-center mx-auto mb-8 ">
                        <ShieldCheck className="h-12 w-12 text-zinc-200" />
                      </div>
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm italic">Queue is currently empty.</p>
                    </div>
                  ) : (
                    vettingApps.map((app) => (
                      <div key={app.id} className="flex items-center justify-between px-12 py-10 hover:bg-muted/50 transition-all group">
                        <div className="flex items-center gap-8">
                          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-3xl  transition-transform group-hover:scale-110 group-hover:rotate-3">
                            {app.entity_name ? app.entity_name.charAt(0) : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-2xl tracking-tighter mb-1">{app.entity_name}</div>
                            <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
                              <span className="bg-muted px-2 py-0.5 rounded">EIN: {app.ein}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className={cn(
                            "rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider ",
                            app.status === 'approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                            app.status === 'pending' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                          )}>
                            {app.status}
                          </div>
                          <div className="flex gap-4">
                            {app.status === 'pending' && (
                              <>
                                <Button className="h-14 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest bg-primary text-primary-foreground  hover:scale-105 transition-all" onClick={() => handleApproveVetting(app)}>Approve</Button>
                                <Button variant="ghost" className="h-14 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest text-rose-600 hover:bg-rose-50 border border-rose-100 active:scale-95" onClick={() => handleRejectVetting(app)}>Reject</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-0 overflow-hidden border-none  bg-white rounded-xl border border-border">
                <div className="border-b border-border bg-white px-12 py-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-foreground tracking-tighter">User Directory</h3>
                    <p className="text-sm text-muted-foreground mt-2">{allUsers.length} Total Users</p>
                  </div>
                </div>
                <div className="divide-y divide-zinc-50">
                  {allUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between px-12 py-10 hover:bg-muted/50 transition-all group">
                      <div className="flex items-center gap-8">
                        <div className="h-20 w-20 rounded-lg bg-background flex items-center justify-center text-muted-foreground font-bold overflow-hidden  group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                          {user.photo_url ? <img src={user.photo_url} alt="" className="h-full w-full object-cover" /> : <Users className="h-10 w-10" />}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-2xl tracking-tighter mb-1">{user.display_name || user.email}</div>
                          <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <select 
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className="h-14 rounded-2xl border-none bg-muted px-8 text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer pr-12"
                          >
                            <option value="client">Client</option>
                            <option value="provider">Provider</option>
                            <option value="admin">Admin</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleUserVerification(user.id, user.is_verified || false)}
                          className={cn(
                            "flex items-center gap-3 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-2xl transition-all ",
                            user.is_verified 
                              ? "text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100" 
                              : "text-muted-foreground bg-muted border border-border hover:bg-border"
                          )}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </button>
                        <Button 
                          variant="ghost" 
                          className="h-14 w-14 p-0 rounded-2xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100  active:scale-90"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-7 w-7" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-0 overflow-hidden border-none  bg-white rounded-xl border border-border">
              <div className="border-b border-border bg-white px-12 py-10 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-foreground tracking-tighter">All Projects</h3>
                  <p className="text-sm text-muted-foreground mt-2">{projects.length} Active Projects</p>
                </div>
              </div>
              <div className="divide-y divide-zinc-50">
                {projects.length === 0 ? (
                  <div className="px-12 py-32 text-center">
                    <div className="h-24 w-24 rounded-full bg-background flex items-center justify-center mx-auto mb-8 ">
                      <Briefcase className="h-12 w-12 text-zinc-200" />
                    </div>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm italic">Registry is currently empty.</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="flex flex-col md:flex-row md:items-center justify-between px-12 py-10 hover:bg-muted/50 transition-all group">
                      <div className="flex items-center gap-10">
                        <div className={cn(
                          "flex h-20 w-20 items-center justify-center rounded-lg  transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                          project.status === 'active' ? "bg-emerald-500 text-primary-foreground " : 
                          project.status === 'in-review' ? "bg-amber-500 text-primary-foreground " : "bg-primary text-primary-foreground shadow-zinc-900/20"
                        )}>
                          <Briefcase className="h-10 w-10" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-3xl tracking-tighter mb-2">{project.title}</div>
                          <div className="flex items-center gap-6">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-border" />
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">{project.value || 'Valuation Pending'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 mt-6 md:mt-0">
                        <div className={cn(
                          "rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider ",
                          project.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                          project.status === 'in-review' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-background text-muted-foreground border border-border"
                        )}>
                          {project.status.replace('-', ' ')}
                        </div>
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            className="h-16 w-16 p-0 rounded-lg border-border hover:border-zinc-900 hover:bg-primary hover:text-primary-foreground transition-all  active:scale-90"
                            onClick={() => startEditingProject(project)}
                          >
                            <Edit className="h-7 w-7" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-16 w-16 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100  active:scale-90"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-8 w-8" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Modals */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 rounded-xl  border border-border">
            <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{confirmModal.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-10 rounded-lg text-sm font-medium border-border hover:bg-muted"
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 h-10 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-700 text-primary-foreground"
                onClick={confirmModal.onConfirm}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}

      {errorModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 rounded-xl  border border-border">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{errorModal.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">{errorModal.message}</p>
            <Button 
              className="w-full h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-zinc-800"
              onClick={() => setErrorModal(prev => ({ ...prev, show: false }))}
            >
              Dismiss
            </Button>
          </Card>
        </div>
      )}

      {/* Profile Modal */}
      {selectedProviderForProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4 md:p-10">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-0 rounded-xl  relative bg-background border border-border">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedProviderForProfile(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-white  border border-border hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="p-6 md:p-8">
              {loadingProfile ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <ProviderProfileContent 
                  provider={selectedProviderForProfile} 
                  completedProjects={completedProjectsForProfile} 
                  onConnect={() => {
                    setSelectedProviderForMessage(selectedProviderForProfile);
                    setSelectedProviderForProfile(null);
                  }}
                  vettingData={vettingApps.find(app => app.provider_id === selectedProviderForProfile.id)}
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Messaging Modal */}
      {selectedProviderForMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-xl  border border-border overflow-hidden">
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
