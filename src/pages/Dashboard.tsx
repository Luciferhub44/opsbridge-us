import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  Camera,
  User,
  Loader2, DollarSign,
  FileText
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

import logoUrl from '../assets/logo.svg';

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
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({
    displayName: '',
    companyName: '',
    industry: '',
    location: '',
    bio: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

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
    if (!profile?.id) return;

    const fetchUnreadMessages = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', profile.id);
      
      setUnreadMessagesCount(count || 0);
    };

    fetchUnreadMessages();

    // Subscribe to messages changes to update count
    const channel = supabase
      .channel('unread-messages-count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages'
      }, fetchUnreadMessages)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel(`user-notifications-${profile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        console.log("Notification change received:", payload);
        fetchNotifications();
      })
      .subscribe((status) => {
        console.log("Notification subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingSettings(true);
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
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      toast.success('Profile picture updated!');
      // The context listener might pick this up, but we can force reload to guarantee UI refresh
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
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

  const markAllNotificationsAsRead = async () => {
    if (!profile?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      toast.error('Failed to mark all as read');
    }
  };

  const [providers, setProviders] = useState<any[]>([]);
  const [vettingApps, setVettingApps] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
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
      
      if (profile.role === 'client') {
        query = query.eq('client_id', profile.id);
      } else if (profile.role === 'provider') {
        // Providers see their own projects and open projects they can apply for
        query = query.or(`provider_id.eq.${profile.id},status.eq.open`);
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

        const { data: documentsData } = await supabase.from('documents').select('*, owner:profiles(display_name, email)');
        if (documentsData) {
          setAllDocuments(documentsData);
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

  const handleApproveProject = async (projectId: string, clientId: string, projectTitle: string) => {
    try {
      const { error } = await supabase.from('projects').update({ status: 'open' }).eq('id', projectId);
      if (error) throw error;
      
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'open' } : p));
      
      await supabase.from('notifications').insert([{
        user_id: clientId,
        title: 'Project Approved',
        message: `Your project "${projectTitle}" has been approved and is now open for provider applications.`,
        read: false
      }]);
      
      toast.success("Project approved successfully!");
    } catch (error) {
      console.error("Error approving project:", error);
      toast.error("Failed to approve project.");
    }
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

  const handleApproveDocument = async (doc: any) => {
    try {
      await supabase.from('documents').update({ status: 'verified' }).eq('id', doc.id);
      
      await supabase.from('notifications').insert([{
        user_id: doc.owner_id,
        title: 'Document Approved',
        message: `Your document "${doc.name}" has been reviewed and verified.`,
        read: false
      }]);

      setAllDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'verified' } : d));
      toast.success('Document approved.');
    } catch (error) {
      console.error("Error approving document:", error);
      toast.error('Failed to approve document.');
    }
  };

  const handleRejectDocument = async (doc: any) => {
    try {
      // For simplicity, we'll just update status. In a real app, you might add a rejection reason.
      await supabase.from('documents').update({ status: 'rejected' }).eq('id', doc.id);
      
      await supabase.from('notifications').insert([{
        user_id: doc.owner_id,
        title: 'Document Action Required',
        message: `Your document "${doc.name}" was rejected. Please upload a revised version.`,
        read: false
      }]);

      setAllDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'rejected' } : d));
      toast.error('Document rejected.');
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast.error('Failed to reject document.');
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
      <aside className="w-72 border-r border-border bg-card flex flex-col h-screen sticky top-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <img src={logoUrl} alt="OpsBridge Logo" className="h-10 w-10" />
            <span className="text-2xl font-bold tracking-tighter text-foreground">OpsBridge</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { id: 'projects', label: 'Projects', icon: Briefcase },
              { 
                id: 'messages', 
                label: 'Messages', 
                icon: MessageSquare,
                badge: unreadMessagesCount > 0 ? unreadMessagesCount : null 
              },
              profile?.role === 'admin' && { id: 'providers', label: 'Providers', icon: Users },
              { id: 'documents', label: 'Documents', icon: ShieldCheck },
              { id: 'settings', label: 'Settings', icon: Settings },
              profile?.role === 'admin' && { id: 'admin', label: 'Admin', icon: ShieldCheck },
            ].filter(Boolean).map((item: any) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                  activeTab === item.id 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-foreground" : "text-muted-foreground")} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
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
                className="h-10 w-64 rounded-lg border border-border bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
            </div>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg bg-card p-2 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border-2 border-background"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute top-20 right-8 w-80 bg-card rounded-xl  border border-border z-50 overflow-hidden shadow-xl">
                <div className="p-3 border-b border-border flex items-center justify-between bg-background">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
                  <div className="flex items-center gap-2">
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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
                          "p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors",
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
                <Button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
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
                <Card key={i} className="p-6 border border-border  bg-card rounded-xl">
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
              <Card className="p-0 overflow-hidden border border-border  bg-card rounded-xl">
                <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Recent Activity</h3>
                  <Button variant="ghost" size="sm" className="text-xs font-medium text-muted-foreground hover:text-foreground">View All</Button>
                </div>
                <div className="p-6 space-y-6">
                  {projects.slice(0, 5).map((project, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0 border border-border text-muted-foreground">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div className="flex-1 border-b border-border pb-6 last:border-0 last:pb-0">
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
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Projects</h2>
                  <p className="text-muted-foreground mt-1 font-medium">Track and manage your project initiatives and proposals.</p>
                </div>
              </div>
              {profile.role === 'client' && (
                <Link to="/brief-builder">
                  <Button className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95 gap-2">
                    <Plus className="h-5 w-5" />
                    New Project
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Open (Accepting Apps)', value: projects.filter(p => p.status === 'open').length, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'In Review', value: projects.filter(p => p.status === 'in-review').length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
              ].map((stat, i) => (
                <Card key={i} className="p-6 border border-border bg-card rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground mb-1">{stat.label}</h3>
                    <p className="text-3xl font-black text-foreground">{stat.value}</p>
                  </div>
                  <div className={cn("h-14 w-14 rounded-full flex items-center justify-center", stat.bg, stat.color)}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-0 overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
              <div className="border-b border-border bg-muted/20 px-6 py-5">
                <h3 className="text-lg font-bold text-foreground">Project Directory</h3>
              </div>
              <div className="divide-y divide-border">
                {projects.length === 0 ? (
                  <div className="px-6 py-24 text-center flex flex-col items-center max-w-sm mx-auto">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                      <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-2">No projects yet</h4>
                    <p className="text-muted-foreground text-sm font-medium mb-8">
                      {profile.role === 'client' 
                        ? 'Start your first project to begin your US expansion journey.' 
                        : 'There are no open projects available at the moment. Check back later.'}
                    </p>
                    {profile.role === 'client' && (
                      <Link to="/brief-builder" className="inline-block">
                        <Button variant="outline" className="h-11 px-8 rounded-xl text-sm font-bold border-2">
                          Create a Project
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="flex flex-col md:flex-row md:items-center justify-between px-6 py-6 hover:bg-muted/30 transition-all group gap-4">
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm shrink-0 transition-colors",
                          project.status === 'active' ? "bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-100" : 
                          project.status === 'open' ? "bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-100" : 
                          project.status === 'in-review' ? "bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-100" : 
                          "bg-background border-border text-muted-foreground group-hover:bg-muted"
                        )}>
                          <Briefcase className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors">{project.title}</div>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {project.value || 'Budget TBD'}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full md:w-auto justify-end mt-2 md:mt-0">
                        <div className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border shadow-sm mr-2",
                          project.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                          project.status === 'open' ? "bg-blue-50 text-blue-600 border-blue-200" : 
                          project.status === 'in-review' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-muted text-muted-foreground border-border"
                        )}>
                          {project.status.replace('-', ' ')}
                        </div>
                        <Link to={`/project/${project.id}`}>
                          <Button variant="outline" className="h-10 px-5 rounded-xl text-sm font-semibold border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
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
          <div className="max-w-5xl space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Account Settings</h2>
              <p className="text-muted-foreground mt-1">Manage your profile, business details, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                {/* Profile Picture Card */}
                <Card className="p-6 border border-border bg-card rounded-2xl text-center flex flex-col items-center shadow-sm">
                  <div className="relative mb-4 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <div className="h-28 w-28 rounded-full overflow-hidden bg-muted border-4 border-background shadow-md relative">
                       {profile.photo_url ? (
                         <img src={profile.photo_url} alt="Profile" className="h-full w-full object-cover" />
                       ) : (
                         <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-muted-foreground bg-primary/5">
                            {profile.display_name?.charAt(0) || profile.email?.charAt(0).toUpperCase()}
                         </div>
                       )}
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="h-8 w-8 text-white" />
                       </div>
                    </div>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-foreground text-lg">{profile.display_name || 'Your Name'}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 capitalize">{profile.role}</p>
                  
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    onChange={handleAvatarUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-6 w-full rounded-xl h-10 font-medium"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    Change Picture
                  </Button>
                </Card>

                {/* Account Status Card */}
                <Card className="p-6 border border-border bg-card rounded-2xl shadow-sm">
                  <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Account Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Verification</span>
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border",
                        profile.is_verified ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {profile.is_verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {profile.is_verified ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Role</span>
                      <span className="text-sm font-bold capitalize text-primary bg-primary/10 px-2.5 py-1 rounded-md">{profile.role}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="md:col-span-2 space-y-6">
                <Card className="p-0 border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-border bg-muted/10">
                    <h3 className="text-lg font-bold text-foreground">Profile Information</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Update your personal and business details here.</p>
                  </div>
                  
                  <form onSubmit={handleUpdateSettings} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="text" 
                            value={settingsForm.displayName}
                            onChange={(e) => setSettingsForm({ ...settingsForm, displayName: e.target.value })}
                            className="h-11 rounded-xl bg-background border-border pl-10 focus:ring-2 focus:ring-primary/20 text-sm"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                          <Input 
                            type="email" 
                            disabled
                            value={profile.email}
                            className="h-11 rounded-xl bg-muted/50 border-border text-muted-foreground text-sm cursor-not-allowed font-medium"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Email cannot be changed directly.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="text" 
                            value={settingsForm.companyName}
                            onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                            className="h-11 rounded-xl bg-background border-border pl-10 focus:ring-2 focus:ring-primary/20 text-sm"
                            placeholder="Acme Corp"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Industry</label>
                        <select 
                          value={settingsForm.industry}
                          onChange={(e) => setSettingsForm({ ...settingsForm, industry: e.target.value })}
                          className="w-full h-11 rounded-xl bg-background border-border px-4 text-sm focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all font-medium"
                        >
                          <option value="">Select Industry</option>
                          <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Retail & E-commerce">Retail & E-commerce</option>
                          <option value="Professional Services">Professional Services</option>
                          <option value="Technology">Technology</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location / HQ</label>
                      <Input 
                        type="text" 
                        value={settingsForm.location}
                        onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                        className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20 text-sm"
                        placeholder="e.g. New York, NY"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bio / Description</label>
                      <textarea 
                        value={settingsForm.bio}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                        className="w-full min-h-[120px] rounded-xl bg-background border-border border p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-y"
                        placeholder="Tell us about your business, operations, and goals..."
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                      <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl text-sm font-medium hover:bg-muted mt-6">Cancel</Button>
                      <Button type="submit" disabled={isSavingSettings} className="mt-6 h-11 px-8 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm transition-all active:scale-95">
                        {isSavingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        {isSavingSettings ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Card>

                <Card className="p-0 border border-rose-200 bg-rose-50/30 rounded-2xl overflow-hidden shadow-sm">
                   <div className="px-6 py-5 border-b border-rose-100 bg-rose-50/50">
                    <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-rose-600" />
                      Danger Zone
                    </h3>
                  </div>
                  <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 mb-1">Delete Account</h4>
                      <p className="text-sm text-rose-700/80 font-medium">Permanently remove your account and all of its contents from the platform. This action is not reversible.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="shrink-0 h-10 px-6 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-rose-200 transition-colors"
                      onClick={handleDeleteAccount}
                    >
                      Delete Account
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
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
                <Button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Search</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-card rounded-xl border border-border">
                  <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center mx-auto mb-4 border border-border text-muted-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">No providers found</h4>
                  <p className="text-muted-foreground text-sm mt-1">Verified partners will appear here.</p>
                </div>
              ) : (
                providers.map((provider) => (
                  <Card key={provider.id} className="p-6 border border-border  bg-card rounded-xl flex flex-col">
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
                          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
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
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>

            {isCreatingProject && (
              <Card className="p-6 border border-border  bg-card rounded-xl relative">
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
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Project Title</label>
                      <Input 
                        required
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        placeholder="e.g. System Integration"
                        className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-ring text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Budget</label>
                      <Input 
                        required
                        value={newProject.value}
                        onChange={(e) => setNewProject({ ...newProject, value: e.target.value })}
                        placeholder="e.g. $10,000"
                        className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-ring text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Project Description</label>
                    <textarea 
                      required
                      className="w-full min-h-[150px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={newProject.needs}
                      onChange={(e) => setNewProject({ ...newProject, needs: e.target.value })}
                      placeholder="Describe the requirements and scope..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
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
                  "p-6 rounded-xl border border-border flex flex-col justify-between",
                  stat.color === 'zinc' ? "bg-card" : 
                  stat.color === 'amber' ? "bg-amber-50/50" : "bg-emerald-50/50"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      stat.color === 'zinc' ? "bg-muted text-foreground" :
                      stat.color === 'amber' ? "bg-amber-100 text-amber-600" :
                      "bg-emerald-100 text-emerald-600"
                    )}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="flex flex-col border border-border bg-card rounded-xl overflow-hidden">
                <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Vetting Queue</h3>
                    <p className="text-sm text-muted-foreground">{vettingApps.length} pending requests</p>
                  </div>
                </div>
                <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
                  {vettingApps.length === 0 ? (
                    <div className="px-6 py-16 text-center flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">Queue is currently empty.</p>
                    </div>
                  ) : (
                    vettingApps.map((app) => (
                      <div key={app.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                            {app.entity_name ? app.entity_name.charAt(0) : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm">{app.entity_name}</div>
                            <div className="text-xs text-muted-foreground font-medium mt-0.5">
                              EIN: {app.ein}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider",
                            app.status === 'approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                            app.status === 'pending' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                          )}>
                            {app.status}
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleApproveVetting(app)}>Approve</Button>
                              <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleRejectVetting(app)}>Reject</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="flex flex-col border border-border bg-card rounded-xl overflow-hidden">
                <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">User Directory</h3>
                    <p className="text-sm text-muted-foreground">{allUsers.length} Total Users</p>
                  </div>
                </div>
                <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
                  {allUsers.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden shrink-0">
                          {user.photo_url ? <img src={user.photo_url} alt="" className="h-full w-full object-cover" /> : <Users className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm truncate">{user.display_name || user.email}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <select 
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className="h-8 rounded-md border border-border bg-muted/50 px-3 py-1 text-xs font-medium focus:ring-1 focus:ring-ring outline-none"
                        >
                          <option value="client">Client</option>
                          <option value="provider">Provider</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleToggleUserVerification(user.id, user.is_verified || false)}
                          className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                            user.is_verified 
                              ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" 
                              : "text-muted-foreground bg-muted hover:bg-muted/80"
                          )}
                          title={user.is_verified ? "Verified" : "Unverified"}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-0 overflow-hidden border border-border bg-card rounded-xl shadow-sm mb-6">
              <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Document Management</h3>
                  <p className="text-sm text-muted-foreground">{allDocuments.length} Total Documents</p>
                </div>
              </div>
              <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
                {allDocuments.length === 0 ? (
                  <div className="px-6 py-16 text-center flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No documents found.</p>
                  </div>
                ) : (
                  allDocuments.map((doc) => (
                    <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm truncate">{doc.name}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            Owner: {doc.owner?.display_name || doc.owner?.email || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider",
                          doc.status === 'verified' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                          doc.status === 'pending' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                        )}>
                          {doc.status}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-3 text-xs border-border hover:bg-muted"
                            onClick={() => setViewingDocument(doc)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> View
                          </Button>
                          {doc.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleApproveDocument(doc)}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => handleRejectDocument(doc)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-0 overflow-hidden border-none bg-card rounded-xl border border-border">
              <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">All Projects</h3>
                  <p className="text-sm text-muted-foreground">{projects.length} Active Projects</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {projects.length === 0 ? (
                  <div className="px-6 py-16 text-center flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center mx-auto mb-4 ">
                      <Briefcase className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Registry is currently empty.</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 hover:bg-muted/50 transition-all group gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform",
                          project.status === 'active' ? "bg-emerald-500 text-primary-foreground " : 
                          project.status === 'in-review' ? "bg-amber-500 text-primary-foreground " : "bg-primary text-primary-foreground "
                        )}>
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm truncate">{project.title}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
                              {project.value || 'Valuation Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider",
                          project.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                          project.status === 'in-review' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-background text-muted-foreground border border-border"
                        )}>
                          {project.status.replace('-', ' ')}
                        </div>
                        <div className="flex items-center gap-2">
                          {project.status === 'in-review' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-3 rounded-md border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold"
                              onClick={() => handleApproveProject(project.id, project.client_id, project.title)}
                            >
                              Approve
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8 rounded-md hover:bg-muted hover:text-foreground"
                            onClick={() => startEditingProject(project)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
              className="w-full h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
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
              className="absolute top-4 right-4 z-10 rounded-full bg-card  border border-border hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="p-6 md:p-8">
              {loadingProfile ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <MessagingSystem 
            recipientId={selectedProviderForMessage.id} 
            recipientName={selectedProviderForMessage.display_name || selectedProviderForMessage.email}
            onClose={() => setSelectedProviderForMessage(null)}
          />
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {viewingDocument.name}
              </h3>
              <div className="flex items-center gap-2 shrink-0 pl-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(viewingDocument.url, '_blank')}
                  className="h-9 font-medium"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewingDocument(null)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-muted/10 flex justify-center items-center min-h-[50vh] p-4">
              {viewingDocument.type === 'PNG' || viewingDocument.type === 'JPG' || viewingDocument.type === 'JPEG' ? (
                <img 
                  src={viewingDocument.url} 
                  alt={viewingDocument.name} 
                  className="max-w-full max-h-[75vh] object-contain rounded-md shadow-sm border border-border bg-background" 
                />
              ) : viewingDocument.type === 'DOC' || viewingDocument.type === 'DOCX' || viewingDocument.type === 'XLS' || viewingDocument.type === 'XLSX' ? (
                <iframe 
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingDocument.url)}&embedded=true`} 
                  className="w-full h-[75vh] rounded-md border border-border bg-background" 
                  frameBorder="0" 
                />
              ) : (
                <iframe 
                  src={viewingDocument.url} 
                  className="w-full h-[75vh] rounded-md border border-border bg-background" 
                  frameBorder="0" 
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}