import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Trash2, 
  Briefcase,
  AlertCircle,
  Loader2,
  Calendar,
  X,
  MessageSquare,
  Paperclip,
  FileText,
  Send,
  Download,
  FileSignature,
  PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Tasks() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '' });
  const [savingTask, setSavingTask] = useState(false);
  
  // Task Details Modal State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agreements State
  const [signingAgreement, setSigningAgreement] = useState<any | null>(null);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        let projectsQuery = supabase
          .from('projects')
          .select('id, title, status, client_id, provider_id')
          .in('status', ['active', 'completed']);

        if (profile.role === 'client') {
          projectsQuery = projectsQuery.eq('client_id', profile.id);
        } else if (profile.role === 'provider') {
          projectsQuery = projectsQuery.eq('provider_id', profile.id);
        }

        const { data: projectsData, error: projectsError } = await projectsQuery;
        if (projectsError) throw projectsError;
        
        const assignedProjects = projectsData?.filter(p => p.provider_id) || [];
        setProjects(assignedProjects);

        if (assignedProjects.length > 0) {
          if (!selectedProjectId) {
            setSelectedProjectId(assignedProjects[0].id);
          }

          const projectIds = assignedProjects.map(p => p.id);
          
          const { data: tasksData, error: tasksError } = await supabase
            .from('project_tasks')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;
          setTasks(tasksData || []);

          const { data: agreementsData, error: agreementsError } = await supabase
            .from('agreements')
            .select('*')
            .in('project_id', projectIds);

          if (!agreementsError) {
            setAgreements(agreementsData || []);
          }
        }
      } catch (error) {
        console.error("Error fetching tasks data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'project_tasks' }, 
        () => {
          fetchData(); 
        }
      )
      .subscribe();

    const agreementsChannel = supabase
      .channel('agreements_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agreements' }, 
        () => {
          fetchData(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(agreementsChannel);
    };
  }, [profile, selectedProjectId]);

  // Fetch comments when a task is selected
  useEffect(() => {
    if (!selectedTask) return;

    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, user:profiles(display_name, email, photo_url, role)')
        .eq('task_id', selectedTask.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
      } else {
        setTaskComments(data || []);
      }
    };

    fetchComments();

    const channel = supabase
      .channel(`task_comments_${selectedTask.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${selectedTask.id}` }, 
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTask?.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedProjectId) return;

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (!selectedProject) return;

    setSavingTask(true);
    try {
      const { error } = await supabase.from('project_tasks').insert([
        {
          project_id: selectedProject.id,
          client_id: selectedProject.client_id,
          provider_id: selectedProject.provider_id,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
          status: 'pending'
        }
      ]);

      if (error) throw error;
      
      toast.success('Task created successfully');
      setIsAddingTask(false);
      setNewTask({ title: '', description: '', dueDate: '' });
      
      await supabase.from('notifications').insert([
        {
          user_id: selectedProject.provider_id,
          title: 'New Task Assigned',
          message: `A new task "${newTask.title}" has been added to project "${selectedProject.title}".`,
          read: false
        }
      ]);

    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || 'Failed to create task');
    } finally {
      setSavingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      // Notify the other party
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const notifyUserId = profile?.id === task.client_id ? task.provider_id : task.client_id;
        const project = projects.find(p => p.id === task.project_id);
        
        await supabase.from('notifications').insert([
          {
            user_id: notifyUserId,
            title: 'Task Status Updated',
            message: `Task "${task.title}" is now marked as ${newStatus} in project "${project?.title}".`,
            read: false
          }
        ]);
      }

      // If modal is open for this task, update local state
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile || !selectedTask || !newComment.trim()) return;

    try {
      const { error } = await supabase.from('task_comments').insert([
        {
          task_id: selectedTask.id,
          user_id: profile.id,
          content: newComment.trim()
        }
      ]);

      if (error) throw error;

      // Notify the other party
      const notifyUserId = profile.id === selectedTask.client_id ? selectedTask.provider_id : selectedTask.client_id;
      const project = projects.find(p => p.id === selectedTask.project_id);
      
      await supabase.from('notifications').insert([
        {
          user_id: notifyUserId,
          title: 'New Comment on Task',
          message: `${profile.display_name || 'Someone'} commented on task "${selectedTask.title}" in project "${project?.title}".`,
          read: false
        }
      ]);

      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !selectedTask) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size must be less than 15MB');
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedTask.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task_attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task_attachments')
        .getPublicUrl(fileName);

      const { error: commentError } = await supabase.from('task_comments').insert([
        {
          task_id: selectedTask.id,
          user_id: profile.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: fileExt?.toUpperCase() || 'FILE',
          content: 'Uploaded a file'
        }
      ]);

      if (commentError) throw commentError;
      
      // Notify the other party
      const notifyUserId = profile.id === selectedTask.client_id ? selectedTask.provider_id : selectedTask.client_id;
      const project = projects.find(p => p.id === selectedTask.project_id);
      
      await supabase.from('notifications').insert([
        {
          user_id: notifyUserId,
          title: 'File Uploaded to Task',
          message: `${profile.display_name || 'Someone'} uploaded a file to task "${selectedTask.title}" in project "${project?.title}".`,
          read: false
        }
      ]);

      toast.success('File uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingAgreement || !signature.trim()) return;

    setSigning(true);
    try {
      const { error } = await supabase
        .from('agreements')
        .update({
          status: 'signed',
          signature: signature.trim(),
          signed_at: new Date().toISOString()
        })
        .eq('id', signingAgreement.id);

      if (error) throw error;

      toast.success(`${signingAgreement.type.toUpperCase()} signed successfully!`);
      setSigningAgreement(null);
      setSignature('');

      // Notify the client that the provider signed
      const project = projects.find(p => p.id === signingAgreement.project_id);
      if (project) {
        await supabase.from('notifications').insert([
          {
            user_id: project.client_id,
            title: 'Agreement Signed',
            message: `The provider has signed the ${signingAgreement.type.toUpperCase()} for "${project.title}".`,
            read: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error signing agreement:', error);
      toast.error('Failed to sign agreement. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading your tasks...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Project Tasks</h2>
              <p className="text-muted-foreground mt-1 font-medium">Manage instructions and deliverables for your active projects.</p>
            </div>
          </div>
        </div>
        <Card className="px-6 py-24 text-center border border-border bg-card rounded-2xl shadow-sm flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Briefcase className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-2">No Active Projects</h4>
          <p className="text-muted-foreground text-sm font-medium mb-8 max-w-md mx-auto">
            {profile?.role === 'client' 
              ? "You don't have any assigned projects yet. Tasks can be managed once a provider is assigned." 
              : "You don't have any active projects right now. Once assigned, your tasks will appear here."}
          </p>
        </Card>
      </div>
    );
  }

  const selectedProjectTasks = tasks.filter(t => t.project_id === selectedProjectId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  const selectedProjectAgreements = agreements.filter(a => a.project_id === selectedProjectId);
  const pendingAgreements = selectedProjectAgreements.filter(a => a.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Project Tasks</h2>
            <p className="text-muted-foreground mt-1 font-medium">Manage instructions and deliverables for your active projects.</p>
          </div>
        </div>
        {profile?.role === 'client' && selectedProjectId && pendingAgreements.length === 0 && (
          <Button 
            className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95 gap-2"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-5 w-5" />
            Add New Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Active Projects</h3>
          <div className="space-y-2">
            {projects.map((project) => {
              const projectPendingAgreements = agreements.filter(a => a.project_id === project.id && a.status === 'pending');
              
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border transition-all flex flex-col gap-1",
                    selectedProjectId === project.id 
                      ? "bg-primary/5 border-primary/30 shadow-sm" 
                      : "bg-card border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "font-bold text-sm truncate flex-1 pr-2",
                      selectedProjectId === project.id ? "text-primary" : "text-foreground"
                    )}>
                      {project.title}
                    </span>
                    {projectPendingAgreements.length > 0 && (
                      <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center justify-between w-full">
                    {projectPendingAgreements.length > 0 ? (
                      <span className="text-rose-500 font-bold uppercase tracking-wider">Action Required</span>
                    ) : (
                      <>
                        <span>{tasks.filter(t => t.project_id === project.id).length} Tasks</span>
                        {tasks.filter(t => t.project_id === project.id && t.status === 'completed').length} completed
                      </>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {pendingAgreements.length > 0 ? (
             <Card className="p-8 border border-rose-200 bg-rose-50/50 rounded-2xl shadow-sm text-center flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-6 border-4 border-rose-50">
                  <FileSignature className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Agreements Pending</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-8 font-medium">
                  {profile?.role === 'provider' 
                    ? "Before you can view or accept tasks for this project, you must sign the required Non-Disclosure Agreement (NDA) and Memorandum of Understanding (MOU)." 
                    : "Waiting for the provider to sign the project's NDA and MOU. Tasks cannot be assigned until these are completed."}
                </p>

                {profile?.role === 'provider' && (
                  <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                    {pendingAgreements.map(agreement => (
                      <Button 
                        key={agreement.id}
                        onClick={() => setSigningAgreement(agreement)}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <PenTool className="h-4 w-4" />
                        Sign {agreement.type.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
             </Card>
          ) : (
            <>
              {isAddingTask && profile?.role === 'client' && (
                <Card className="p-6 border border-primary/20 bg-primary/5 rounded-2xl shadow-sm relative">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-4 right-4 text-muted-foreground hover:bg-muted"
                    onClick={() => setIsAddingTask(false)}
                  >
                    Cancel
                  </Button>
                  <h3 className="text-lg font-bold text-foreground mb-4">Add Task to {selectedProject?.title}</h3>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title</label>
                      <Input 
                        required
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="e.g., Deliver preliminary compliance report"
                        className="h-10 rounded-lg bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Instructions / Description</label>
                      <textarea 
                        className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Provide detailed instructions..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Date (Optional)</label>
                      <Input 
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="h-10 rounded-lg bg-background border-border"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingTask} className="h-10 px-6 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
                        {savingTask ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        {savingTask ? 'Saving...' : 'Save Task'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <Card className="overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
                <div className="border-b border-border bg-muted/20 px-6 py-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Project Tasks & Assignments</h3>
                  <span className="text-xs font-semibold text-muted-foreground bg-background border border-border px-3 py-1 rounded-full">
                    {selectedProjectTasks.length} Total
                  </span>
                </div>
                
                <div className="divide-y divide-border">
                  {selectedProjectTasks.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border border-border text-muted-foreground">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h4 className="text-base font-bold text-foreground">No tasks assigned yet.</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        {profile?.role === 'client' ? 'Create a task to instruct your provider.' : 'Waiting for client instructions.'}
                      </p>
                    </div>
                  ) : (
                    selectedProjectTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-6 hover:bg-muted/30 transition-colors group flex flex-col sm:flex-row gap-4 cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="pt-1 shrink-0">
                          <div
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center border",
                              task.status === 'completed' 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : task.status === 'in-progress'
                                ? "bg-amber-100 border-amber-300 text-amber-600"
                                : "bg-background border-border text-transparent"
                            )}
                          >
                            {task.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
                            {task.status === 'in-progress' && <Clock className="h-3 w-3" />}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h4 className={cn(
                              "text-base font-bold transition-all",
                              task.status === 'completed' ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                              {task.title}
                            </h4>
                            
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <div className={cn(
                                  "h-7 rounded-md border px-3 py-1 flex items-center text-[10px] font-bold uppercase tracking-wider",
                                  task.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                  task.status === 'in-progress' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                  "bg-background text-muted-foreground border-border"
                                )}>
                                {task.status.replace('-', ' ')}
                              </div>

                              {profile?.role === 'client' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {task.description && (
                            <p className={cn(
                              "text-sm bg-muted/40 p-3 rounded-lg border border-border/50 line-clamp-2",
                              task.status === 'completed' ? "text-muted-foreground/70" : "text-muted-foreground"
                            )}>
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mt-2">
                            {task.due_date && (
                              <span className={cn(
                                "flex items-center gap-1",
                                new Date(task.due_date) < new Date() && task.status !== 'completed' ? "text-rose-500" : ""
                              )}>
                                <Calendar className="h-3 w-3" />
                                Due {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Click to open task details
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Task Details & Comments Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-3xl h-[85vh] flex flex-col p-0 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-border bg-muted/10 shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                    selectedTask.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                    selectedTask.status === 'in-progress' ? "bg-amber-50 text-amber-600 border-amber-200" :
                    "bg-background text-muted-foreground border-border"
                  )}>
                    {selectedTask.status.replace('-', ' ')}
                  </div>
                  {selectedTask.due_date && (
                    <span className={cn(
                      "flex items-center gap-1 text-xs font-semibold",
                      new Date(selectedTask.due_date) < new Date() && selectedTask.status !== 'completed' ? "text-rose-500" : "text-muted-foreground"
                    )}>
                      <Calendar className="h-3 w-3" />
                      Due {new Date(selectedTask.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                    {selectedTask.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedTask(null)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
                <select 
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}
                  className="h-8 rounded-lg border border-border px-3 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 bg-background hover:bg-muted/50 transition-colors"
                >
                  <option value="pending">Mark as Pending</option>
                  <option value="in-progress">Mark In Progress</option>
                  <option value="completed">Mark Completed</option>
                </select>
              </div>
            </div>

            {/* Comments Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
              {taskComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No activity yet. Be the first to start the conversation.</p>
                </div>
              ) : (
                taskComments.map(comment => (
                  <div key={comment.id} className={cn(
                    "flex gap-4",
                    comment.user_id === profile?.id ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden shrink-0 border border-border">
                      {comment.user?.photo_url ? (
                        <img src={comment.user.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{comment.user?.display_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div className={cn(
                      "flex flex-col max-w-[80%]",
                      comment.user_id === profile?.id ? "items-end" : "items-start"
                    )}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-foreground">
                          {comment.user?.display_name || comment.user?.email || 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {comment.content && comment.content !== 'Uploaded a file' && (
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                          comment.user_id === profile?.id 
                            ? "bg-primary text-primary-foreground rounded-tr-sm" 
                            : "bg-muted border border-border text-foreground rounded-tl-sm"
                        )}>
                          {comment.content}
                        </div>
                      )}

                      {comment.file_url && (
                        <a 
                          href={comment.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-3 mt-1.5 px-4 py-3 rounded-2xl border transition-colors group",
                            comment.user_id === profile?.id 
                              ? "bg-primary/10 border-primary/20 hover:bg-primary/20" 
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            comment.user_id === profile?.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{comment.file_name}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{comment.file_type}</p>
                          </div>
                          <Download className="h-4 w-4 ml-2 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card shrink-0">
              <form onSubmit={handleAddComment} className="flex items-end gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0 border-border hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}
                </Button>
                <div className="flex-1 relative">
                  <Input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a message or share an update..."
                    className="h-11 rounded-xl bg-background border-border pr-12 focus:ring-1 focus:ring-primary shadow-sm"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="absolute right-1 top-1 h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!newComment.trim() || uploadingFile}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
            
          </Card>
        </div>
      )}

      {/* Agreement Signing Modal */}
      {signingAgreement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/10 shrink-0">
               <div>
                  <div className="flex items-center gap-2 text-primary font-bold mb-1">
                     <FileSignature className="h-5 w-5" />
                     Sign Document
                  </div>
                  <h3 className="text-xl font-black text-foreground">
                    {signingAgreement.type === 'nda' ? 'Non-Disclosure Agreement' : 'Memorandum of Understanding'}
                  </h3>
               </div>
               <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSigningAgreement(null)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-muted/5 border-b border-border">
              <div className="prose prose-stone prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground">
                 <Markdown remarkPlugins={[remarkGfm]}>{signingAgreement.content}</Markdown>
              </div>
            </div>
            <div className="p-6 bg-card shrink-0 space-y-4">
               <p className="text-sm font-medium text-foreground">By typing your name below, you are signing this agreement electronically.</p>
               <form onSubmit={handleSignAgreement} className="flex flex-col sm:flex-row items-center gap-4">
                 <div className="flex-1 w-full relative">
                    <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Type your full legal name to sign"
                      className="h-12 pl-10 rounded-xl bg-background border-border shadow-sm focus:ring-primary/20 text-base"
                    />
                 </div>
                 <Button 
                   type="submit" 
                   disabled={signing || !signature.trim()}
                   className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all active:scale-95 w-full sm:w-auto"
                 >
                   {signing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                   Sign & Accept
                 </Button>
               </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}