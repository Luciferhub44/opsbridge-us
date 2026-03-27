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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-xl border border-zinc-200">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Secure Documents</h2>
          <p className="text-zinc-500 mt-2 font-medium">A secure place to store and manage your important US business files.</p>
        </div>
        <Button 
          className="gap-2 h-11 px-6 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors" 
          onClick={handleUpload} 
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          Upload File
        </Button>
      </div>

      <Card className="p-8 bg-zinc-900 text-white border-none rounded-xl relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 mb-6">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-2">Security Protocol</div>
            <div className="text-2xl font-bold mb-3">Enterprise-Grade Encryption</div>
            <p className="text-zinc-400 font-medium leading-relaxed max-w-2xl">
              Your data is protected by industry-standard encryption, ensuring complete privacy and security for your sensitive documents.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-zinc-200 bg-white rounded-xl shadow-none">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-8 py-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Document Repository</h3>
            <p className="text-sm text-zinc-500 mt-1">Your uploaded business files</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
          ) : documents.length === 0 ? (
            <div className="px-8 py-20 text-center flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-zinc-300" />
              </div>
              <h4 className="text-lg font-bold text-zinc-900 mb-1">No documents yet</h4>
              <p className="text-zinc-500 text-sm">Upload your first document to get started.</p>
            </div>
          ) : (
            documents.map((doc, index) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between px-8 py-6 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 text-base mb-1">{doc.name}</div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-100 text-xs font-medium text-zinc-600 uppercase">
                        {doc.type || 'PDF'}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full",
                    doc.status === 'verified' ? "bg-emerald-50 text-emerald-600" : 
                    doc.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-zinc-50 text-zinc-600"
                  )}>
                    {doc.status === 'verified' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {doc.status || 'Pending'}
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => window.open(doc.url, '_blank')}>
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
