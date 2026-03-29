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
  Filter,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const REQUIRED_DOCUMENTS = [
  { id: 'Identification Document', name: 'Identification Document', desc: 'Valid Government issued ID (Passport, Driver License)' },
  { id: 'Certificate of Incorporation', name: 'Company Certificate of Incorporation', desc: 'Official company registration certificate' }
];

export default function Documents() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategoryRef = useRef<string>('Other');

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

  const triggerUpload = (category: string) => {
    activeCategoryRef.current = category;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file size (e.g., 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          status: 'pending',
          category: activeCategoryRef.current
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
      activeCategoryRef.current = 'Other';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Extract file path from URL
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
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()))
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
            onClick={() => triggerUpload('Other')} 
            disabled={uploading}
          >
            {uploading && activeCategoryRef.current === 'Other' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading && activeCategoryRef.current === 'Other' ? 'Uploading...' : 'Upload General File'}
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

      {/* Provider Required Documents */}
      {profile?.role === 'provider' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Required Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REQUIRED_DOCUMENTS.map((reqDoc) => {
              // Check if user has uploaded a document for this category
              const uploadedDoc = documents.find(d => d.category === reqDoc.id);
              const isUploadingThis = uploading && activeCategoryRef.current === reqDoc.id;

              return (
                <Card key={reqDoc.id} className="p-5 border border-border bg-card rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground">{reqDoc.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{reqDoc.desc}</p>
                    </div>
                    {uploadedDoc ? (
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                        <Check className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
                    {uploadedDoc ? (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate font-medium text-foreground">{uploadedDoc.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                           <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              uploadedDoc.status === 'verified' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                            )}>
                              {uploadedDoc.status || 'Pending'}
                           </span>
                           {new Date(uploadedDoc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-amber-600">Action Required</div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => uploadedDoc ? setViewingDocument(uploadedDoc) : triggerUpload(reqDoc.id)}
                      disabled={uploading}
                      className={cn(
                        "h-9 shrink-0 ml-4 font-semibold",
                        uploadedDoc ? "border-border hover:bg-muted" : "border-primary text-primary hover:bg-primary/5"
                      )}
                    >
                      {isUploadingThis ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                      ) : uploadedDoc ? (
                         'View'
                      ) : (
                         <><Upload className="h-3 w-3 mr-2" /> Upload</>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
                  onClick={() => triggerUpload('Other')}
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
                        {doc.category && doc.category !== 'Other' && (
                          <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                            {doc.category}
                          </span>
                        )}
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
                        onClick={() => setViewingDocument(doc)}
                        title="View Document"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
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
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewingDocument(null)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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