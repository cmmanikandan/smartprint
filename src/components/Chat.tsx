import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format } from 'date-fns';
import { Send, User, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  isAdmin: boolean;
}

interface ChatProps {
  orderId: string;
  isAdminView?: boolean;
}

export default function Chat({ orderId, isAdminView = false }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `orders/${orderId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Chat error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `orders/${orderId}/messages`), {
        text: messageText,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'User',
        createdAt: new Date().toISOString(),
        isAdmin: isAdminView
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-bottom flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Chat with {isAdminView ? 'Customer' : 'Shop'}
        </h3>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            return (
              <div 
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-medium text-gray-500">
                    {msg.senderName}
                  </span>
                  {msg.isAdmin && (
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                  )}
                </div>
                <div 
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm",
                    isMe 
                      ? "bg-purple-600 text-white rounded-tr-none" 
                      : "bg-white border text-gray-800 rounded-tl-none shadow-sm"
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-gray-400 mt-1">
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form 
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-purple-600 outline-none"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-purple-600 text-white p-2 rounded-full disabled:opacity-50 hover:scale-105 transition-transform"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
