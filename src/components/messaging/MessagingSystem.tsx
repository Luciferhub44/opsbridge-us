import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  MessageSquare, 
  X,
  Search,
  Clock,
  Trash2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  is_read?: boolean;
}

interface Chat {
  id: string;
  participant_ids: string[];
  last_message?: string;
  last_message_sender_id?: string;
  updated_at: string;
  otherParticipantName?: string;
  unreadCount?: number;
}

interface MessagingSystemProps {
  recipientId?: string;
  recipientName?: string;
  onClose?: () => void;
}

export default function MessagingSystem({ recipientId, recipientName, onClose }: MessagingSystemProps) {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherParticipantTyping, setOtherParticipantTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch or create chat with recipientId
  useEffect(() => {
    if (!user || !recipientId) return;

    const findOrCreateChat = async () => {
      try {
        const { data: existingChats, error: fetchError } = await supabase
          .from('chats')
          .select('*')
          .contains('participant_ids', [user.id, recipientId]);

        if (fetchError) throw fetchError;

        if (existingChats && existingChats.length > 0) {
          const chat = existingChats[0] as Chat;
          setActiveChat(chat);
        } else {
          // Create new chat
          const { data: newChat, error: createError } = await supabase
            .from('chats')
            .insert([
              {
                participant_ids: [user.id, recipientId],
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          setActiveChat(newChat as Chat);
        }
      } catch (error) {
        console.error('Error finding/creating chat:', error);
      }
    };

    findOrCreateChat();
  }, [user, recipientId]);

  // Fetch all chats for the user
  const fetchChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const fetchedChats = await Promise.all((data || []).map(async (chat) => {
        const otherId = chat.participant_ids.find((p: string) => p !== user.id) || user.id;
        
        // Fetch other participant's name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', otherId)
          .single();

        // Fetch unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...chat,
          otherParticipantName: profileData?.display_name || 'User',
          unreadCount: count || 0
        } as Chat;
      }));

      setChats(fetchedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchChats();

    const channel = supabase
      .channel('chats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Update unread counts when new messages arrive
        if (payload.new.sender_id !== user.id) {
          fetchChats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch messages for active chat
  const fetchMessages = async () => {
    if (!activeChat || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark as read
      const unreadIds = (data || [])
        .filter(m => !m.is_read && m.sender_id !== user.id)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
        
        // Refresh chats to clear unread count badge
        fetchChats();
      }

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    if (!activeChat) return;
    fetchMessages();

    const messagesChannel = supabase
      .channel(`messages_${activeChat.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${activeChat.id}`
        }, 
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing_${activeChat.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user?.id) {
          setOtherParticipantTyping(payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [activeChat]);

  const handleTyping = (isTyping: boolean) => {
    if (!activeChat || !user) return;

    supabase.channel(`typing_${activeChat.id}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping }
    });
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      handleTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTyping(false);
    }, 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent, attachment?: { url: string, name: string, type: string }) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    if (!activeChat || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    handleTyping(false);

    try {
      const { data: msgData, error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: activeChat.id,
            text: messageText || (attachment ? `Sent an attachment: ${attachment.name}` : ''),
            sender_id: user.id,
            attachment_url: attachment?.url,
            attachment_name: attachment?.name,
            attachment_type: attachment?.type
          }
        ])
        .select()
        .single();

      if (messageError) throw messageError;

      const { error: chatError } = await supabase
        .from('chats')
        .update({
          updated_at: new Date().toISOString(),
          last_message: messageText || (attachment ? 'Attachment' : ''),
          last_message_sender_id: user.id
        })
        .eq('id', activeChat.id);

      if (chatError) throw chatError;

      // Trigger notification for recipient
      const recipientId = activeChat.participant_ids.find((p: string) => p !== user.id);
      if (recipientId) {
        await supabase.from('notifications').insert([
          {
            user_id: recipientId,
            title: 'New Message',
            message: `${profile?.display_name || 'A user'} sent you a message.`,
            read: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-attachments/${activeChat.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Storage bucket "attachments" not found. Please create it in Supabase dashboard.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      await handleSendMessage(undefined, {
        url: publicUrl,
        name: file.name,
        type: file.type
      });

      toast.success('File uploaded');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
      
      if (error) throw error;
      if (activeChat?.id === chatId) setActiveChat(null);
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;

    const isImage = msg.attachment_type?.startsWith('image/');

    return (
      <div className="mt-2 p-2 rounded-lg bg-background/50 border border-border/50">
        {isImage ? (
          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={msg.attachment_url} 
              alt={msg.attachment_name} 
              className="max-w-full rounded-md max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <a 
            href={msg.attachment_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            <span className="truncate max-w-[200px]">{msg.attachment_name}</span>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[600px] w-full max-w-4xl overflow-hidden rounded-xl bg-card shadow-none border border-border">
      {/* Sidebar: Chat List */}
      <div className="w-80 border-r border-border bg-background flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messages
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm italic">No conversations yet</div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors relative ${
                  activeChat?.id === chat.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-card border border-transparent'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="text-left overflow-hidden flex-1">
                  <div className="font-semibold text-foreground truncate flex justify-between items-center">
                    {chat.otherParticipantName}
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {chat.last_message_sender_id === user?.id ? 'You: ' : ''}
                    {chat.last_message || 'No messages yet'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className="flex-1 flex flex-col bg-card">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-foreground">{activeChat.otherParticipantName}</div>
                  <div className="text-xs text-emerald-500 flex items-center gap-1">
                    {otherParticipantTyping ? (
                      <span className="flex items-center gap-1 animate-pulse italic text-primary">
                        is typing...
                      </span>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Online
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {profile?.role === 'admin' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteChat(activeChat.id)}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
                {onClose && (
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/50"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm relative group ${
                    msg.sender_id === user?.id 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-card text-foreground border border-border rounded-tl-none'
                  }`}>
                    {msg.text}
                    {renderAttachment(msg)}
                    {profile?.role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-card rounded-full shadow-md border border-border flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className={`text-[10px] mt-1 opacity-70 flex items-center gap-1 ${
                      msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender_id === user?.id && (
                        msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {otherParticipantTyping && (
                <div className="flex justify-start">
                  <div className="bg-card text-muted-foreground border border-border rounded-2xl rounded-tl-none p-3 text-xs italic animate-pulse">
                    Typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-muted-foreground"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  value={newMessage}
                  onChange={onInputChange}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full bg-background border-border focus:ring-primary/100"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10 flex-shrink-0"
                  disabled={!newMessage.trim() && !uploading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-background flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
            <p className="max-w-xs text-sm">Choose a provider from the list to start messaging or view your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}
