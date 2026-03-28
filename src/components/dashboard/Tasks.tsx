import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function Tasks() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '' });
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        // Fetch active projects where user is either client or provider
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
        
        // Filter out projects that haven't been assigned a provider yet
        const assignedProjects = projectsData?.filter(p => p.provider_id) || [];
        setProjects(assignedProjects);

        if (assignedProjects.length > 0) {
          if (!selectedProjectId) {
            setSelectedProjectId(assignedProjects[0].id);
          }

          // Fetch all tasks for these projects
          const projectIds = assignedProjects.map(p => p.id);
          const { data: tasksData, error: tasksError } = await supabase
            .from('project_tasks')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;
          setTasks(tasksData || []);
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
          fetchData(); // Simplest way to sync
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedProjectId]);

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
      
      // Notify provider
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
      
      // Optionally notify client if provider completes task
      if (newStatus === 'completed' && profile?.role === 'provider') {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const project = projects.find(p => p.id === task.project_id);
          await supabase.from('notifications').insert([
            {
              user_id: task.client_id,
              title: 'Task Completed',
              message: `Task "${task.title}" in project "${project?.title}" has been completed.`,
              read: false
            }
          ]);
        }
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
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
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
        {profile?.role === 'client' && selectedProjectId && (
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
        {/* Project Selector Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Active Projects</h3>
          <div className="space-y-2">
            {projects.map((project) => (
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
                <span className={cn(
                  "font-bold text-sm truncate",
                  selectedProjectId === project.id ? "text-primary" : "text-foreground"
                )}>
                  {project.title}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium flex items-center justify-between">
                  <span>{tasks.filter(t => t.project_id === project.id).length} Tasks</span>
                  {tasks.filter(t => t.project_id === project.id && t.status === 'completed').length} completed
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Task List Main Area */}
        <div className="lg:col-span-3 space-y-6">
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
                  <div key={task.id} className="p-6 hover:bg-muted/30 transition-colors group flex flex-col sm:flex-row gap-4">
                    <div className="pt-1 shrink-0">
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center border transition-colors",
                          task.status === 'completed' 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "bg-background border-border hover:border-primary text-transparent hover:text-primary/30"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className={cn(
                          "text-base font-bold transition-all",
                          task.status === 'completed' ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <select 
                            value={task.status}
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                            className={cn(
                              "h-7 rounded-md border px-2 py-0 text-xs font-bold uppercase tracking-wider outline-none appearance-none pr-6 bg-no-repeat",
                              task.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                              task.status === 'in-progress' ? "bg-amber-50 text-amber-600 border-amber-200" :
                              "bg-background text-muted-foreground border-border"
                            )}
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right .5rem center', backgroundSize: '.65em auto' }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>

                          {profile?.role === 'client' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <p className={cn(
                          "text-sm bg-muted/40 p-3 rounded-lg border border-border/50",
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
                          <Clock className="h-3 w-3" />
                          Added {new Date(task.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}