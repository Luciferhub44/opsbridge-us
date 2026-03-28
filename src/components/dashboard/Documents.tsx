import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileText, Upload, Download, Lock, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Documents() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
      } else {
        setDocuments(data || []);
      }
      setLoading(false);
    };

    fetchDocuments();

    const channel = supabase
      .channel('documents_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `owner_id=eq.${profile.id}`
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

  const handleUpload = async () => {
    if (!profile) return;
    
    setUploading(true);
    try {
      const docName = prompt('Enter document name:');
      if (!docName) return;

      const { error } = await supabase.from('documents').insert([
        {
          owner_id: profile.id,
          name: docName,
          type: 'PDF',
          status: 'pending',
          url: 'https://example.com/doc.pdf'
        }
      ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-xl border border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Secure Documents</h2>
          <p className="text-muted-foreground mt-2 font-medium">A secure place to store and manage your important US business files.</p>
        </div>
        <Button 
          className="gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors" 
          onClick={handleUpload} 
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          Upload File
        </Button>
      </div>

      <Card className="p-8 bg-primary text-primary-foreground border-none rounded-xl relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/10 mb-6">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-2">Security Protocol</div>
            <div className="text-2xl font-bold mb-3">Enterprise-Grade Encryption</div>
            <p className="text-muted-foreground font-medium leading-relaxed max-w-2xl">
              Your data is protected by industry-standard encryption, ensuring complete privacy and security for your sensitive documents.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-border bg-card rounded-xl shadow-none">
        <div className="border-b border-border bg-background/50 px-8 py-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Document Repository</h3>
            <p className="text-sm text-muted-foreground mt-1">Your uploaded business files</p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="px-8 py-20 text-center flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-1">No documents yet</h4>
              <p className="text-muted-foreground text-sm">Upload your first document to get started.</p>
            </div>
          ) : (
            documents.map((doc, index) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between px-8 py-6 hover:bg-background transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-base mb-1">{doc.name}</div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground uppercase">
                        {doc.type || 'PDF'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full",
                    doc.status === 'verified' ? "bg-emerald-50 text-emerald-600" : 
                    doc.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-background text-muted-foreground"
                  )}>
                    {doc.status === 'verified' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {doc.status || 'Pending'}
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => window.open(doc.url, '_blank')}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
