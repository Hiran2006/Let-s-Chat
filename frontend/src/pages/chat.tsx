import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import type { RootState } from "../store/config";
import { logout } from "../store/slice/authSlice";
import { makeANetworkCall } from "../network/network";

interface Message {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

interface Chat {
  id: string;
  name: string;
  type: "private" | "group";
  avatarGradient: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Message[];
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { name: userName, email: userEmail } = useSelector((state: RootState) => state.auth);

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  
  // State for Create Chat Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [newChatType, setNewChatType] = useState<"private" | "group">("private");
  const [usersList, setUsersList] = useState<User[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [selectedUsersForChat, setSelectedUsersForChat] = useState<string[]>([]);

  const activeChat = chats.find(c => c.id === selectedChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);

  // Sync ref to selectedChatId to avoid stale closures in socket events
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!userEmail) {
      navigate("/");
    }
  }, [userEmail, navigate]);

  // Fetch initial chats list
  const fetchChats = async () => {
    if (!userEmail) return;
    try {
      const response = await makeANetworkCall("/api/chats", "GET");
      if (response.data?.success) {
        setChats(response.data.chats || []);
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [userEmail]);

  // Connect to Socket.io and setup listeners
  useEffect(() => {
    if (!userEmail) return;

    // Connect to Socket.io with credentials (to send cookie automatically)
    const socket = io("http://localhost:3000", {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket.io");
    });

    socket.on("new_message", (msg: {
      id: string;
      chatId: string;
      sender: string;
      senderName: string;
      text: string;
      timestamp: string;
    }) => {
      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === msg.chatId) {
            const exists = c.messages.some((m) => m.id === msg.id);
            const updatedMessages = exists 
              ? c.messages 
              : [...c.messages, {
                  id: msg.id,
                  sender: msg.sender,
                  senderName: msg.senderName,
                  text: msg.text,
                  timestamp: msg.timestamp,
                  isSelf: msg.sender === userEmail,
                }];

            const isCurrentlySelected = selectedChatIdRef.current === msg.chatId;
            const updatedUnreadCount = isCurrentlySelected ? 0 : (c.unreadCount || 0) + 1;

            return {
              ...c,
              lastMessage: msg.text,
              timestamp: msg.timestamp,
              unreadCount: updatedUnreadCount,
              messages: updatedMessages,
            };
          }
          return c;
        });
      });
    });

    socket.on("chat_update", (data: { chatId: string; lastMessage: string; timestamp: string }) => {
      setChats((prevChats) => {
        const updated = prevChats.map((c) => {
          if (c.id === data.chatId) {
            return {
              ...c,
              lastMessage: data.lastMessage,
              timestamp: data.timestamp,
            };
          }
          return c;
        });

        // Reorder list: move active chat to top
        return [...updated].sort((a, b) => {
          if (a.id === data.chatId) return -1;
          if (b.id === data.chatId) return 1;
          return 0;
        });
      });
    });

    socket.on("new_chat_notification", (data: { chatId: string }) => {
      socket.emit("join_chat", { chatId: data.chatId });
      fetchChats();
    });

    return () => {
      socket.disconnect();
    };
  }, [userEmail]);

  // Scroll to bottom when active chat or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Fetch users when starting a new chat
  useEffect(() => {
    if (isModalOpen) {
      const fetchUsers = async () => {
        try {
          const response = await makeANetworkCall("/api/chats/users", "GET");
          if (response.data?.success) {
            setUsersList(response.data.users || []);
          }
        } catch (error) {
          console.error("Failed to load users:", error);
        }
      };
      fetchUsers();
    } else {
      setNewChatName("");
      setSelectedUsersForChat([]);
      setSearchUserQuery("");
    }
  }, [isModalOpen]);

  const handleSendMessage = () => {
    if (!typedMessage.trim() || !selectedChatId || !socketRef.current) return;

    // Send via socket
    socketRef.current.emit("send_message", {
      chatId: selectedChatId,
      text: typedMessage.trim(),
    });

    setTypedMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    
    // Clear unread count
    setChats(prevChats => 
      prevChats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
    );

    // Fetch messages from database
    try {
      const response = await makeANetworkCall(`/api/chats/${chatId}/messages`, "GET");
      if (response.data?.success) {
        setChats(prevChats => 
          prevChats.map(c => c.id === chatId ? { ...c, messages: response.data.messages } : c)
        );
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleToggleUser = (email: string) => {
    if (newChatType === "private") {
      setSelectedUsersForChat([email]);
    } else {
      setSelectedUsersForChat((prev) =>
        prev.includes(email)
          ? prev.filter((e) => e !== email)
          : [...prev, email]
      );
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsersForChat.length === 0) return;
    if (newChatType === "group" && !newChatName.trim()) return;

    try {
      const response = await makeANetworkCall("/api/chats", "POST", {
        type: newChatType,
        name: newChatType === "group" ? newChatName.trim() : null,
        memberEmails: selectedUsersForChat,
      });

      if (response.data?.success) {
        const { chatId } = response.data;

        if (socketRef.current) {
          // Find matching member IDs
          const ids = usersList
            .filter((u) => selectedUsersForChat.includes(u.email))
            .map((u) => u.id);

          socketRef.current.emit("chat_created", {
            chatId,
            memberIds: ids,
          });

          // Join room immediately
          socketRef.current.emit("join_chat", { chatId });
        }

        // Fetch chats and select the active chat
        await fetchChats();
        setSelectedChatId(chatId);
        
        // Fetch message history
        const msgResponse = await makeANetworkCall(`/api/chats/${chatId}/messages`, "GET");
        if (msgResponse.data?.success) {
          setChats(prevChats => 
            prevChats.map(c => c.id === chatId ? { ...c, messages: msgResponse.data.messages } : c)
          );
        }

        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07070d] text-gray-100">
      
      {/* LEFT SIDEBAR: CHAT LIST */}
      <div className="flex flex-col w-[360px] md:w-[400px] shrink-0 border-r border-white/10 bg-[#0e0e18]/80 backdrop-blur-xl">
        
        {/* Sidebar Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              {userName ? userName.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white uppercase">{userName || "User"}</h2>
              <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all duration-300"
            title="Log Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>

        {/* Search and Action Bar */}
        <div className="px-5 py-4 flex gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search chat or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/5 focus:border-indigo-500/50 outline-none text-white transition-all duration-300 placeholder:text-gray-500"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center transition-all duration-300 shadow-md shadow-indigo-600/20 active:scale-95"
            title="Create New Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Chat List Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-10 px-6">
              <p className="text-sm text-gray-500">No conversations found</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = chat.id === selectedChatId;
              const initials = chat.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              
              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all duration-300 group relative ${
                    isSelected 
                      ? "bg-white/10 shadow-inner" 
                      : "hover:bg-white/5 bg-transparent"
                  }`}
                >
                  {/* Selected Indicator Bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-lg bg-indigo-500"></div>
                  )}

                  {/* Gradient Avatar */}
                  <div className={`h-12 w-12 rounded-xl shrink-0 bg-gradient-to-tr ${chat.avatarGradient} flex items-center justify-center font-bold text-white shadow-md shadow-black/40`}>
                    {initials}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors duration-300 truncate">
                        {chat.name}
                      </h4>
                      <span className="text-[11px] text-gray-500 shrink-0 font-medium">
                        {chat.timestamp}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-xs truncate max-w-[200px] ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                        {chat.lastMessage}
                      </p>
                      
                      {chat.unreadCount > 0 && (
                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: CHAT WINDOW */}
      <div className="flex flex-col flex-1 h-full bg-[#08080f] relative">
        
        {activeChat ? (
          <>
            {/* Chat Top Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-white/10 bg-[#0e0e18]/40 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${activeChat.avatarGradient} flex items-center justify-center font-bold text-white shadow-lg`}>
                  {activeChat.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">{activeChat.name}</h3>
                  <p className="text-xs text-indigo-400/80 font-medium">
                    {activeChat.type === "group" 
                      ? `${activeChat.messages ? activeChat.messages.filter(m => !m.isSelf).map(m => m.senderName).filter((value, index, self) => self.indexOf(value) === index).length + 1 : 1} participants` 
                      : "Direct Message"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
              {!activeChat.messages || activeChat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.92 1.78 4.61 4.61 0 002.77-.825c.318-.18.65-.28 1.04-.253.508.035 1.07.07 1.611.07z" />
                    </svg>
                  </div>
                  <h4 className="text-white font-semibold">Start the Conversation</h4>
                  <p className="text-xs text-gray-500 max-w-xs mt-1">Send a message to kick off the thread. Let's Chat!</p>
                </div>
              ) : (
                activeChat.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[70%] ${msg.isSelf ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    {/* Sender Name */}
                    {!msg.isSelf && activeChat.type === "group" && (
                      <span className="text-xs text-indigo-400 mb-1 ml-1 font-semibold">
                        {msg.senderName}
                      </span>
                    )}

                    {/* Bubble */}
                    <div 
                      className={`px-4.5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                        msg.isSelf 
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none" 
                          : "bg-white/5 border border-white/5 text-gray-200 rounded-tl-none backdrop-blur-sm"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-500 mt-1 mx-1 font-medium">
                      {msg.timestamp}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-6 bg-[#0e0e18]/20 border-t border-white/10">
              <div className="flex items-center gap-3.5 bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all duration-300">
                
                <button className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 100-12 6 6 0 000 12zM12 9v6m3-3H9" />
                  </svg>
                </button>

                <input 
                  type="text" 
                  placeholder={`Write your message here...`}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500"
                />

                <button 
                  onClick={handleSendMessage}
                  disabled={!typedMessage.trim()}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    typedMessage.trim() 
                      ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 scale-100" 
                      : "bg-white/5 text-gray-500 cursor-not-allowed scale-95"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transform rotate-45 -translate-x-[1px] translate-y-[1px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* INITIAL NO CHAT SELECTED STATE */
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-radial-[circle_at_center,rgba(99,102,241,0.06)_0%,transparent_60%]">
            
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-xl animate-pulse"></div>
              <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-bounce">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">No Active Chat</h3>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-6">
              Welcome to Let's Chat! Please select an existing conversation from the sidebar or click the plus button to start a new chat window.
            </p>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all duration-300 active:scale-95"
            >
              Start New Conversation
            </button>
          </div>
        )}
      </div>

      {/* CREATE NEW CHAT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#11111e]/95 border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">Create New Chat</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Chat Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setNewChatType("private");
                      setSelectedUsersForChat([]);
                    }}
                    className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all duration-300 ${
                      newChatType === "private" 
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-400"
                    }`}
                  >
                    Private (1-on-1)
                  </button>
                  <button 
                    onClick={() => {
                      setNewChatType("group");
                      setSelectedUsersForChat([]);
                    }}
                    className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all duration-300 ${
                      newChatType === "group" 
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-400"
                    }`}
                  >
                    Group Chat
                  </button>
                </div>
              </div>

              {newChatType === "group" && (
                <div>
                  <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Group Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Design Sync, Apollo Devs"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500/50 outline-none text-white transition-all duration-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Search & Select Users</label>
                <input 
                  type="text" 
                  placeholder="Type name or email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500/50 outline-none text-white transition-all duration-300 mb-3"
                />

                <div className="max-h-40 overflow-y-auto space-y-1 border border-white/10 rounded-xl p-2 bg-black/35">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No other users found</p>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected = selectedUsersForChat.includes(user.email);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleToggleUser(user.email)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all duration-200 ${
                            isSelected 
                              ? "bg-indigo-600/30 border border-indigo-500/40 text-indigo-200" 
                              : "hover:bg-white/5 border border-transparent text-gray-400"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="text-[10px] text-gray-500">{user.email}</p>
                          </div>
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 transition-all duration-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateChat}
                disabled={
                  selectedUsersForChat.length === 0 || 
                  (newChatType === "group" && !newChatName.trim())
                }
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all duration-300 shadow-lg shadow-indigo-600/20"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
