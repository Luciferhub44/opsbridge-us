import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  MessageSquare, 
  X,
  Search,
  Clock,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
}

interface Chat {
  id: string;
  participant_ids: string[];
  last_message?: string;
  updated_at: string;
  otherParticipantName?: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
          setActiveChat(existingChats[0] as Chat);
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
      let query = supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .contains('participant_ids', [user.id]);

      const { data, error } = await query;

      if (error) throw error;

      const fetchedChats = await Promise.all((data || []).map(async (chat) => {
        const otherId = chat.participant_ids.find((p: string) => p !== user.id) || user.id;
        
        // Fetch other participant's name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', otherId)
          .single();

        return {
          ...chat,
          otherParticipantName: profileData?.display_name || 'User'
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // Fetch messages for active chat
  const fetchMessages = async () => {
    if (!activeChat) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
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

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: activeChat.id,
            text: messageText,
            sender_id: user.id
          }
        ]);

      if (messageError) throw messageError;

      const { error: chatError } = await supabase
        .from('chats')
        .update({
          updated_at: new Date().toISOString()
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
            message: `You have a new message from ${profile?.display_name || 'a user'}.`,
            read: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
    } catch (error) {
      console.error('Error deleting chat:', error);
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
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeChat?.id === chat.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-card border border-transparent'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="text-left overflow-hidden">
                  <div className="font-semibold text-foreground truncate">
                    {chat.otherParticipantName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
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
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Online
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
                    {profile?.role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-card rounded-full shadow-md border border-border flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className={`text-[10px] mt-1 opacity-70 ${
                      msg.sender_id === user?.id ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-full bg-background border-border focus:ring-primary/100"
              />
              <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10">
                <Send className="h-4 w-4" />
              </Button>
            </form>
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
