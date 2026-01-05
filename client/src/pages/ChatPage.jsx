import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlus, Search, MessageSquare, Send, MoreVertical, Users, Phone, X } from "lucide-react";
import io from "socket.io-client";
import api from "../api";

const ENDPOINT = "http://localhost:3000"; 
let socket, selectedChatCompare;

const ChatPage = () => {
  // --- States ---
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]); 
  const [chats, setChats] = useState([]);       
  const [activeTab, setActiveTab] = useState("chats"); // 'chats' or 'contacts'
  const [showAddBox, setShowAddBox] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactName, setNewContactName] = useState("");

  const navigate = useNavigate();
  const scrollRef = useRef();

  // --- 1. Lifecycle: Auth & Initial Data Fetch ---
  useEffect(() => {
    const storedInfo = localStorage.getItem("userInfo");
    if (!storedInfo) {
      navigate("/");
      return;
    }
    const userInfo = JSON.parse(storedInfo);
    setUser(userInfo);
    
    // Fetch both datasets immediately using the token from storage
    fetchContacts(userInfo.token);
    fetchChats(userInfo.token);
    
    // Initialize Socket
    if (!socket) {
      socket = io(ENDPOINT);
      socket.emit("setup", userInfo);
    }

    return () => {
      if (socket) socket.off("message received");
    };
  }, [navigate]);

  const fetchContacts = async (token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await api.get("/api/contacts", config);
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchChats = async (token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await api.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // --- 2. Messaging & Socket Logic ---
  const fetchMessages = async () => {
    if (!selectedChat) return;
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);
      setMessages(data);
      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      console.error("Failed to load messages");
    }
  };

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const messageHandler = (newMessageReceived) => {
      // If the chat is currently open, add message to view
      if (selectedChatCompare && selectedChatCompare._id === newMessageReceived.chat._id) {
        setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
      }
      // ALWAYS refresh chats list so the receiver sees the new message in sidebar
      const currentUser = JSON.parse(localStorage.getItem("userInfo"));
      fetchChats(currentUser.token);
    };

    if (socket) {
      socket.on("message received", messageHandler);
      return () => socket.off("message received", messageHandler);
    }
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.post("/api/message", { 
        content: newMessage, 
        chatId: selectedChat._id 
      }, config);
      
      setNewMessage(""); 
      socket.emit("new message", data);
      setMessages([...messages, data]);
      fetchChats(currentUser.token); // Move this chat to top
    } catch (error) {
      alert("Error sending message");
    }
  };

  // --- 3. Contact Actions ---
  const handleAddContact = async (e) => {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.post("/api/contacts", { 
        phoneNumber: newContactNumber, 
        contactName: newContactName 
      }, config);
      
      setContacts([data, ...contacts]);
      setNewContactNumber("");
      setNewContactName("");
      setShowAddBox(false); // Close the form
      alert("Contact added successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Error adding contact");
    }
  };

  const accessChat = async (targetUserId) => {
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    try {
      const config = {
        headers: { 
          "Content-type": "application/json",
          Authorization: `Bearer ${currentUser.token}` 
        },
      };
      const { data } = await axios.post(`/api/chat`, { userId: targetUserId }, config);
      
      // Update chats list if this is a brand new conversation
      if (!chats.find((c) => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      setSelectedChat(data);
      setActiveTab("chats"); // Switch to chat view
    } catch (error) {
      alert("Error opening chat");
    }
  };

  // --- Helpers ---
  const getOtherUser = (users) => {
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    return users?.find((u) => u._id !== currentUser?._id);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search Logic
  const filteredChats = chats.filter((c) => {
    const other = getOtherUser(c.users);
    return other?.firstName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredContacts = contacts.filter((c) => 
    c.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 antialiased text-slate-900">
      
      {/* --- SIDEBAR --- */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl">
        
        {/* User Header */}
        <div className="p-4 bg-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center font-bold">
              {user?.firstName?.[0] || "?"}
            </div>
            <div>
              <p className="font-bold leading-none">{user?.firstName || "Loading..."}</p>
              <p className="text-[10px] text-blue-200 mt-1">Online</p>
            </div>
          </div>
          <MoreVertical size={20} className="cursor-pointer opacity-80 hover:opacity-100" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 m-2 rounded-lg">
          <button 
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'chats' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MessageSquare size={16} /> Chats
          </button>
          <button 
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'contacts' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16} /> Contacts
          </button>
        </div>

        {/* Sidebar Actions (Search & Add) */}
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

          {activeTab === "contacts" && (
            <div className="space-y-2">
              <button 
                onClick={() => setShowAddBox(!showAddBox)} 
                className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${showAddBox ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {showAddBox ? <X size={16}/> : <UserPlus size={16}/>} 
                {showAddBox ? "Cancel" : "Add New Contact"}
              </button>

              {showAddBox && (
                <form onSubmit={handleAddContact} className="p-3 bg-blue-50 border-2 border-blue-100 rounded-xl space-y-2 animate-in fade-in zoom-in-95">
                  <input placeholder="Mobile Number" className="w-full p-2 text-sm border rounded-md outline-blue-500" value={newContactNumber} onChange={(e) => setNewContactNumber(e.target.value)} required />
                  <input placeholder="Nickname" className="w-full p-2 text-sm border rounded-md outline-blue-500" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} required />
                  <button className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-bold shadow-md">Save to Contacts</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Scrollable List */}
        <div className="flex-1 overflow-y-auto px-2">
          {activeTab === "chats" ? (
            filteredChats.length > 0 ? filteredChats.map((chat) => {
              const other = getOtherUser(chat.users);
              const isSaved = contacts.find(c => c.contactUser?._id === other?._id);
              return (
                <div 
                  key={chat._id} 
                  onClick={() => setSelectedChat(chat)} 
                  className={`flex items-center gap-3 p-3 mb-1 rounded-xl cursor-pointer transition-all ${selectedChat?._id === chat._id ? 'bg-blue-50 shadow-sm border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}
                >
                  <img src={other?.pic} className="w-12 h-12 rounded-full border shadow-sm" alt="avatar" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 truncate">
                      {isSaved ? isSaved.contactName : `${other?.firstName} ${other?.lastName}`}
                    </h4>
                    <p className="text-xs text-slate-500 truncate italic">
                      {chat.latestMessage?.content || "No messages yet"}
                    </p>
                  </div>
                </div>
              );
            }) : <div className="p-10 text-center text-slate-400 text-sm italic">No recent chats.</div>
          ) : (
            filteredContacts.length > 0 ? filteredContacts.map((c) => (
              <div 
                key={c._id} 
                onClick={() => accessChat(c.contactUser?._id)} 
                className="flex items-center gap-3 p-3 mb-1 rounded-xl cursor-pointer hover:bg-slate-50 border-b border-slate-50"
              >
                <img src={c.contactUser?.pic} className="w-12 h-12 rounded-full border shadow-sm" alt="u" />
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{c.contactName}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={12} /> {c.phoneNumber}</p>
                </div>
              </div>
            )) : <div className="p-10 text-center text-slate-400 text-sm italic">No contacts found.</div>
          )}
        </div>
      </div>

      {/* --- CHAT DISPLAY AREA --- */}
      <div className="hidden md:flex flex-1 flex-col relative bg-slate-100">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b flex items-center gap-3 shadow-sm z-10">
              <img src={getOtherUser(selectedChat.users)?.pic} className="w-10 h-10 rounded-full border" alt="u" />
              <div>
                <h2 className="font-bold text-slate-800">
                  {getOtherUser(selectedChat.users)?.firstName} {getOtherUser(selectedChat.users)?.lastName}
                </h2>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Active Now</p>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3 bg-[#e5ddd5]">
              {messages.map((m) => {
                const isMe = m.sender?._id === (user?._id || JSON.parse(localStorage.getItem("userInfo"))?._id);
                return (
                  <div 
                    key={m._id} 
                    className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm animate-in fade-in slide-in-from-bottom-1 ${isMe ? "bg-blue-600 text-white self-end rounded-tr-none" : "bg-white text-slate-800 self-start rounded-tl-none"}`}
                  >
                    <p>{m.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
              <form className="flex items-center gap-2" onSubmit={sendMessage}>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 p-3 bg-slate-100 rounded-xl outline-none text-sm focus:ring-1 ring-blue-400" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                />
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 shadow-md transition-transform active:scale-95">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-300">
             <MessageSquare size={120} className="opacity-10" />
             <h2 className="text-3xl font-bold text-slate-400 mt-4 italic">Connect.</h2>
             <p className="mt-2 text-slate-500">Choose a contact to start your conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;