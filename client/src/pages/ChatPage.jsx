import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Search, MessageSquare, Send, MoreVertical, Users, Phone, X } from "lucide-react";
import io from "socket.io-client";
import api from "../api";

const ENDPOINT = "http://localhost:3000"; 
let socket, selectedChatCompare;

const ChatPage = () => {
  // --- STATE DECLARATIONS ---
  const [user, setUser] = useState(null); // Current logged-in user
  const [contacts, setContacts] = useState([]); // User's contact list
  const [chats, setChats] = useState([]); // User's chat conversations
  const [activeTab, setActiveTab] = useState("chats"); // Active sidebar tab
  const [showAddBox, setShowAddBox] = useState(false); // Show/hide add contact form
  const [searchQuery, setSearchQuery] = useState(""); // Search filter query
  const [selectedChat, setSelectedChat] = useState(null); // Currently selected chat
  const [messages, setMessages] = useState([]); // Messages in selected chat
  const [newMessage, setNewMessage] = useState(""); // New message input
  const [newContactNumber, setNewContactNumber] = useState(""); // New contact phone
  const [newContactName, setNewContactName] = useState(""); // New contact name
  const [loading, setLoading] = useState(true); // Initial loading state
  const [socketConnected, setSocketConnected] = useState(false); // Socket connection status
  const [connectionError, setConnectionError] = useState(false); // Connection error flag

  const navigate = useNavigate();
  const scrollRef = useRef(); // For auto-scrolling to latest message
  const messageInputRef = useRef(null); // Reference to message input field

  // --- 1. INITIALIZATION & DATA LOADING ---
  useEffect(() => {
    // Check if user is logged in
    const storedInfo = localStorage.getItem("userInfo");
    if (!storedInfo) {
      navigate("/");
      return;
    }
    
    const userInfo = JSON.parse(storedInfo);
    setUser(userInfo);
    
    // 🔥 CRITICAL: Initialize socket connection ONLY ONCE
    if (!socket) {
      console.log("🔌 Initializing socket connection...");
      socket = io(ENDPOINT, {
        transports: ["websocket", "polling"], // Use WebSocket with fallback
        reconnection: true, // Enable auto-reconnection
        reconnectionAttempts: 5, // Try 5 times
        reconnectionDelay: 1000, // Start with 1 second delay
        reconnectionDelayMax: 5000, // Max 5 seconds delay
        randomizationFactor: 0.5, // Randomize reconnection timing
      });
      
      // --- SOCKET EVENT HANDLERS ---
      
      // Handle successful connection
      socket.on("connect", () => {
        console.log("✅ Socket.io connected, socket ID:", socket.id);
        setSocketConnected(true);
        setConnectionError(false);
        
        // Send user data to join personal room
        socket.emit("setup", userInfo);
        console.log(`👤 Emitted setup for user: ${userInfo._id}`);
      });
      
      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log("❌ Socket.io disconnected:", reason);
        setSocketConnected(false);
        
        // Set error flag for certain disconnect reasons
        if (reason === "io server disconnect" || reason === "transport close") {
          setConnectionError(true);
        }
      });
      
      // Handle connection errors
      socket.on("connect_error", (error) => {
        console.error("🔌 Socket connection error:", error);
        setSocketConnected(false);
        setConnectionError(true);
      });
      
      // Handle successful reconnection
      socket.on("reconnect", (attemptNumber) => {
        console.log(`🔄 Socket reconnected (attempt ${attemptNumber})`);
        setSocketConnected(true);
        setConnectionError(false);
        
        // Re-setup user after reconnection
        socket.emit("setup", userInfo);
      });
      
      // Handle reconnection errors
      socket.on("reconnect_error", (error) => {
        console.error("🔌 Socket reconnection error:", error);
        setConnectionError(true);
      });
      
      // Handle failed reconnection
      socket.on("reconnect_failed", () => {
        console.error("🔌 Socket reconnection failed");
        setConnectionError(true);
      });
      
      // Server acknowledgment
      socket.on("connected", () => {
        console.log("✅ Server acknowledged socket setup");
      });
    }

    // Load user data (contacts and chats)
    const loadData = async () => {
      try {
        await Promise.all([
          fetchContacts(userInfo.token),
          fetchChats(userInfo.token)
        ]);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 🔥 IMPORTANT: Cleanup on component unmount
    return () => {
      console.log("🧹 ChatPage cleanup - removing socket listeners");
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("reconnect");
        socket.off("reconnect_error");
        socket.off("reconnect_failed");
        socket.off("connected");
        socket.off("message received");
      }
    };
  }, [navigate]);

  // --- DATA FETCHING FUNCTIONS ---
  
  // Fetch user's contacts
  const fetchContacts = async (token) => {
    try {
      console.log("📞 Fetching contacts...");
      const { data } = await api.get("/api/contacts");
      console.log(`✅ Loaded ${data.length} contacts`);
      setContacts(data);
    } catch (error) {
      console.error("❌ Failed to fetch contacts:", error);
    }
  };

  // Fetch user's chats
  const fetchChats = async (token) => {
    try {
      const { data } = await api.get("/api/chat");
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // --- 2. MESSAGE HANDLING ---
  
  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      selectedChatCompare = selectedChat; // Store for socket comparison
      
      // Auto-focus message input with small delay
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 100);
    }
  }, [selectedChat]);

  // Fetch messages for selected chat
  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const { data } = await api.get(`/api/message/${selectedChat._id}`);
      setMessages(data);
      
      // 🔥 CRITICAL: Join the chat room AFTER messages are loaded
      if (socket) {
        // Small delay ensures socket is ready
        setTimeout(() => {
          socket.emit("join chat", selectedChat._id);
          console.log(`💬 Joined chat room: ${selectedChat._id}`);
        }, 100);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  // --- SOCKET MESSAGE LISTENER ---
  useEffect(() => {
    // Handle incoming real-time messages
    const handleNewMessage = (newMessageReceived) => {
      console.log("📨 Socket: Message received event triggered", {
        messageId: newMessageReceived._id,
        content: newMessageReceived.content,
        chatId: newMessageReceived.chat._id,
        senderId: newMessageReceived.sender?._id,
        myId: user?._id
      });
      
      // 🔥 FIX: Check if message is for current chat
      if (!selectedChatCompare || selectedChatCompare._id !== newMessageReceived.chat._id) {
        console.log("⚠️ Message not for current chat, updating chat list only");
        
        // Still update chats list to show new message in sidebar
        if (user?.token) {
          fetchChats(user.token);
        }
        return;
      }
      
      // 🔥 FIX: Prevent duplicate messages with ID check
      setMessages(prev => {
        // Check if this message already exists
        const messageExists = prev.some(msg => {
          // Skip temporary messages in comparison
          if (msg.isTemp) return false;
          return msg._id === newMessageReceived._id;
        });
        
        if (messageExists) {
          console.log("⚠️ DUPLICATE MESSAGE DETECTED - Ignoring", newMessageReceived._id);
          return prev;
        }
        
        console.log("✅ Adding new message to state:", newMessageReceived.content);
        
        // Remove any temporary messages with same content
        const filteredPrev = prev.filter(msg => 
          !msg.isTemp || msg.content !== newMessageReceived.content
        );
        
        return [...filteredPrev, newMessageReceived];
      });
      
      // Update chats list for sidebar preview
      if (user?.token) {
        fetchChats(user.token);
      }
    };

    // Attach socket listener
    if (socket) {
      socket.on("message received", handleNewMessage);
    }

    // Cleanup listener on unmount
    return () => {
      if (socket) {
        console.log("🧹 Removing message received listener");
        socket.off("message received", handleNewMessage);
      }
    };
  }, [selectedChatCompare, user]); // Re-run when selected chat or user changes

  // --- SEND MESSAGE FUNCTION ---
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    
    // 🔥 CRITICAL: Create temporary message for OPTIMISTIC UPDATE
    // This shows message immediately in UI without waiting for server
    const tempMessageId = `temp_${Date.now()}`;
    const tempMessage = {
      _id: tempMessageId,
      sender: user,
      content: newMessage,
      chat: selectedChat,
      createdAt: new Date().toISOString(),
      isTemp: true // Flag to identify temporary messages
    };
    
    // 1. OPTIMISTIC UPDATE: Add temporary message to UI immediately
    setMessages(prev => [...prev, tempMessage]);
    
    // 2. Clear input field immediately
    setNewMessage("");
    
    try {
      // 3. Send message to server via API
      const { data } = await api.post("/api/message", {
        content: newMessage,
        chatId: selectedChat._id
      });
      
      console.log("📤 Message saved to database:", data.content);
      
      // 4. Replace temporary message with real one from server
      setMessages(prev => prev.map(msg => 
        msg._id === tempMessageId ? data : msg
      ));
      
      // 5. BROADCAST MESSAGE VIA SOCKET for real-time delivery
      if (socket && socketConnected) {
        console.log("📡 Emitting message via socket to room:", selectedChat._id);
        socket.emit("new message", data);
      } else {
        console.log("⚠️ Socket not connected, message saved but not broadcasted");
      }
      
      // 6. Update chats list for latest message preview
      if (user?.token) {
        fetchChats(user.token);
      }
      
      // 7. Refocus input for next message
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // 8. REMOVE TEMPORARY MESSAGE if send failed
      setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
      
      alert("Failed to send message. Please try again.");
    }
  };

  // --- 3. CONTACT MANAGEMENT ---
  const handleAddContact = async (e) => {
    e.preventDefault();
    
    if (!newContactNumber.trim() || !newContactName.trim()) {
      alert("Please enter both phone number and name");
      return;
    }

    console.log("➕ ADDING CONTACT...");
    console.log("Phone:", newContactNumber);
    console.log("Name:", newContactName);

    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    
    try {
      const { data } = await api.post("/api/contacts", {
        phoneNumber: newContactNumber,
        contactName: newContactName
      });

      console.log("✅ Contact added successfully:", data);
      
      setContacts(prevContacts => {
        const updated = [data, ...prevContacts];
        console.log("🔄 Contacts updated. Total:", updated.length);
        return updated;
      });

      setNewContactNumber("");
      setNewContactName("");
      setShowAddBox(false);
      
      alert(`✅ ${data.contactName} added to contacts!`);
      
    } catch (error) {
      console.error("❌ Error adding contact:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "Failed to add contact";
      
      alert(`❌ ${errorMessage}`);
    }
  };

  // Open or create a chat with a contact
  const accessChat = async (targetUserId) => {
    if (!targetUserId) {
      alert("Cannot open chat: Invalid contact");
      return;
    }

    try {
      const { data } = await api.post("/api/chat", { userId: targetUserId });
      
      // Add to chats list if not already there
      if (!chats.find(c => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      
      setSelectedChat(data);
      setActiveTab("chats"); // Switch to chats tab
    } catch (error) {
      console.error("Error opening chat:", error);
      alert("Failed to open chat");
    }
  };

  // --- HELPER FUNCTIONS ---
  
  // Get the other user in a chat (not the current user)
  const getOtherUser = (users) => {
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    return users?.find(u => u._id !== currentUser?._id);
  };

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search functionality
  const filteredChats = chats.filter(chat => {
    const other = getOtherUser(chat.users);
    const name = other ? `${other.firstName} ${other.lastName}`.toLowerCase() : "";
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredContacts = contacts.filter(contact =>
    contact.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery)
  );

  // Manual socket reconnection function
  const handleManualReconnect = () => {
    console.log("🔄 Manual reconnect triggered");
    if (socket) {
      socket.disconnect();
      setTimeout(() => {
        socket.connect();
        
        // Re-setup user after reconnection
        const storedInfo = localStorage.getItem("userInfo");
        if (storedInfo) {
          const userInfo = JSON.parse(storedInfo);
          setTimeout(() => {
            if (socket.connected) {
              socket.emit("setup", userInfo);
              console.log("🔄 Re-emitted setup after manual reconnect");
            }
          }, 1000);
        }
      }, 500);
    }
  };

  // Auto-reconnect attempt
  useEffect(() => {
    if (!socketConnected && !connectionError) {
      const timer = setTimeout(() => {
        console.log("⏰ Auto-reconnect attempt");
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [socketConnected, connectionError]);

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your messages...</p>
          <p className="text-xs text-slate-400 mt-2">Socket: {socketConnected ? "✅ Connected" : "🔌 Connecting..."}</p>
        </div>
      </div>
    );
  }

  // --- MAIN COMPONENT RENDER ---
  return (
    <div className="flex h-screen bg-slate-50 antialiased text-slate-900">
      {/* --- LEFT SIDEBAR --- */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl">
        
        {/* USER HEADER */}
        <div className="p-4 bg-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center font-bold">
              {user?.firstName?.[0] || "U"}
            </div>
            <div>
              <p className="font-bold leading-none">{user?.firstName || "User"}</p>
              {/* Connection Status */}
              <div className="flex items-center gap-2 mt-1">
                {socketConnected ? (
                  <span className="text-[10px] text-green-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Online
                  </span>
                ) : connectionError ? (
                  <span className="text-[10px] text-red-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Disconnected
                  </span>
                ) : (
                  <span className="text-[10px] text-yellow-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    Connecting...
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Connection Controls */}
          <div className="flex items-center gap-2">
            {/* Manual Reconnect Button (only show when error) */}
            {connectionError && (
              <button
                onClick={handleManualReconnect}
                className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded flex items-center gap-1 transition-colors"
                title="Click to reconnect to chat server"
              >
                <span>🔁</span>
                Reconnect
              </button>
            )}
            
            {/* Auto-connecting Indicator */}
            {!socketConnected && !connectionError && (
              <div className="text-[10px] text-blue-200 animate-pulse">
                Auto-connecting...
              </div>
            )}
            
            {/* Settings Menu */}
            <MoreVertical 
              size={20} 
              className="cursor-pointer opacity-80 hover:opacity-100" 
            />
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-slate-100 p-1 m-2 rounded-lg">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'chats' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MessageSquare size={16} /> Chats ({chats.length})
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'contacts' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16} /> Contacts ({contacts.length})
          </button>
        </div>

        {/* SEARCH & ADD CONTACT */}
        <div className="px-4 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-1 ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Add Contact Form (only in contacts tab) */}
          {activeTab === "contacts" && (
            <div className="space-y-2">
              <button
                onClick={() => setShowAddBox(!showAddBox)}
                className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${showAddBox ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {showAddBox ? <X size={16} /> : <UserPlus size={16} />}
                {showAddBox ? "Cancel" : "Add New Contact"}
              </button>

              {/* Contact Form */}
              {showAddBox && (
                <form onSubmit={handleAddContact} className="p-3 bg-blue-50 border-2 border-blue-100 rounded-xl space-y-2">
                  <input
                    placeholder="Phone number"
                    className="w-full p-2 text-sm border rounded-md outline-blue-500"
                    value={newContactNumber}
                    onChange={(e) => setNewContactNumber(e.target.value)}
                    required
                  />
                  <input
                    placeholder="Contact name"
                    className="w-full p-2 text-sm border rounded-md outline-blue-500"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-bold shadow-md hover:bg-blue-700"
                  >
                    Add Contact
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* CONTACTS/CHATS LIST */}
        <div className="flex-1 overflow-y-auto px-2">
          {activeTab === "chats" ? (
            // CHATS TAB CONTENT
            filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const other = getOtherUser(chat.users);
                const contact = contacts.find(c => c.contactUser?._id === other?._id);
                
                return (
                  <div
                    key={chat._id}
                    onClick={() => setSelectedChat(chat)}
                    className={`flex items-center gap-3 p-3 mb-1 rounded-xl cursor-pointer transition-all ${selectedChat?._id === chat._id ? 'bg-blue-50 shadow-sm border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 border flex items-center justify-center">
                      {other?.pic ? (
                        <img src={other.pic} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <span className="font-bold text-blue-600">
                          {other?.firstName?.[0] || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">
                        {contact ? contact.contactName : `${other?.firstName || ""} ${other?.lastName || ""}`}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {chat.latestMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-slate-400 text-sm">
                No chats yet. Start by adding a contact!
              </div>
            )
          ) : (
            // CONTACTS TAB CONTENT
            filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => {
                    if (contact.contactUser?._id) {
                      accessChat(contact.contactUser._id);
                    } else {
                      alert("This contact cannot be messaged. Please re-add them.");
                    }
                  }}
                  className="flex items-center gap-3 p-3 mb-1 rounded-xl cursor-pointer hover:bg-slate-50 border-b border-slate-50"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 border flex items-center justify-center">
                    {contact.contactUser?.pic ? (
                      <img src={contact.contactUser.pic} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <span className="font-bold text-green-600">
                        {contact.contactName?.[0] || "C"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{contact.contactName}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone size={12} /> {contact.phoneNumber}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      {contact.contactUser ? "Click to message" : "Contact info incomplete"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-400 text-sm">
                <Users size={48} className="mx-auto mb-4 opacity-30" />
                <p>No contacts yet.</p>
                <p className="mt-2 text-xs">Add your first contact using the button above!</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="hidden md:flex flex-1 flex-col relative bg-slate-100">
        {selectedChat ? (
          // CHAT SELECTED VIEW
          <>
            {/* CHAT HEADER */}
            <div className="p-4 bg-white border-b flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-100 border flex items-center justify-center">
                {getOtherUser(selectedChat.users)?.pic ? (
                  <img 
                    src={getOtherUser(selectedChat.users).pic} 
                    alt="" 
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <span className="font-bold text-blue-600">
                    {getOtherUser(selectedChat.users)?.firstName?.[0] || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-slate-800">
                  {getOtherUser(selectedChat.users)?.firstName} {getOtherUser(selectedChat.users)?.lastName}
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    {socketConnected ? "🟢 Online" : "🟡 Connecting..."}
                  </p>
                  <p className="text-[8px] text-gray-400">
                    Socket: {socketConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
            </div>

            {/* MESSAGES CONTAINER */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3 bg-[#e5ddd5]">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.sender?._id === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? "bg-blue-600 text-white self-end rounded-tr-none" : "bg-white text-slate-800 self-start rounded-tl-none"}`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 mt-10">
                  <p>No messages yet. Say hello! 👋</p>
                </div>
              )}
              {/* Auto-scroll anchor */}
              <div ref={scrollRef} />
            </div>

            {/* MESSAGE INPUT FORM */}
            <div className="p-4 bg-white border-t">
              <form className="flex items-center gap-2" onSubmit={sendMessage}>
                <input
                  ref={messageInputRef}
                  type="text"
                  placeholder={socketConnected ? "Type a message..." : "Connecting to chat..."}
                  className="flex-1 p-3 bg-slate-100 rounded-xl outline-none text-sm focus:ring-1 ring-blue-400 focus:bg-white"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!selectedChat}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !selectedChat}
                  className={`p-3 rounded-xl shadow-md ${newMessage.trim() && selectedChat ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          // NO CHAT SELECTED (WELCOME VIEW)
          <div className="h-full flex flex-col justify-center items-center text-slate-300">
            <MessageSquare size={120} className="opacity-10" />
            <h2 className="text-3xl font-bold text-slate-400 mt-4 italic">Welcome to Chat!</h2>
            <p className="mt-2 text-slate-500">Select a contact to start messaging</p>
            <div className="mt-8 text-sm text-slate-400 bg-white p-4 rounded-xl shadow">
              <p>💡 <span className="font-bold">Tips:</span></p>
              <p className="text-xs mt-1">• Add contacts using the "Add New Contact" button</p>
              <p className="text-xs">• Click on any contact to start chatting</p>
              <p className="text-xs">• Your messages are synced across devices</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;