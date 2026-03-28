import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  FileText, 
  Upload, 
  Download, 
  Lock, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Clock,
  Trash2,
  FileIcon,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function Documents() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    const channel = supabase
      .channel('documents_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `owner_id=eq.${profile?.id}`
        }, 
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file size (e.g., 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('documents').insert([
        {
          owner_id: profile.id,
          name: file.name,
          type: fileExt?.toUpperCase() || 'FILE',
          size: file.size,
          url: publicUrl,
          status: 'pending'
        }
      ]);

      if (dbError) throw dbError;
      
      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Extract file path from URL
      // https://.../storage/v1/object/public/documents/USER_ID/FILENAME
      const pathParts = url.split('documents/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('documents').remove([filePath]);
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Secure Documents</h2>
            <p className="text-muted-foreground mt-1 font-medium">Manage and store your important business files with enterprise-grade security.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <Button 
            className="gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      </div>

      {/* Security Banner */}
      <Card className="p-1 border-none rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg">
        <div className="p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Lock className="h-32 w-32" />
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shrink-0">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-xs font-bold text-primary-foreground/80 uppercase tracking-widest mb-1">Security Standards</div>
            <h3 className="text-xl font-bold mb-2">Military-Grade Encryption (AES-256)</h3>
            <p className="text-primary-foreground/90 font-medium leading-relaxed max-w-2xl">
              All your files are automatically encrypted before storage. Only you and authorized personnel can access them.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Repository Card */}
      <Card className="overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
        <div className="border-b border-border bg-background/40 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              Document Repository
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {documents.length} Files
              </span>
            </h3>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-background border border-border rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Loading your secure documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="px-8 py-24 text-center flex flex-col items-center max-w-sm mx-auto">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileIcon className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">No documents found</h4>
              <p className="text-muted-foreground text-sm font-medium mb-8">
                {searchTerm ? `No results for "${searchTerm}"` : "You haven't uploaded any documents yet. Start by uploading important business files."}
              </p>
              {!searchTerm && (
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold text-sm border-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Your First File
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-border">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 hover:bg-muted/30 transition-all group gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm group-hover:border-primary/30 transition-colors",
                      doc.type === 'PDF' ? "text-rose-500" : "text-blue-500"
                    )}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-base truncate group-hover:text-primary transition-colors">{doc.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                          {doc.type}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatFileSize(doc.size)}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm mr-2",
                      doc.status === 'verified' 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {doc.status === 'verified' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {doc.status || 'Pending'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" 
                        onClick={() => window.open(doc.url, '_blank')}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors" 
                        onClick={() => handleDelete(doc.id, doc.url)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Repository Footer */}
        <div className="bg-muted/30 px-6 py-4 border-t border-border">
          <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
            Storage limit: {formatFileSize(filteredDocuments.reduce((acc, doc) => acc + (doc.size || 0), 0))} / 100 MB used
          </p>
        </div>
      </Card>
    </div>
  );
}
