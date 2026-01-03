import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlus, Search, MessageSquare, Send, MoreVertical, Phone, Video } from "lucide-react";
import io from "socket.io-client";

const ENDPOINT = "http://localhost:3000"; // Your Backend URL
var socket, selectedChatCompare;

const ChatPage = () => {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  
  // Messaging States
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  // States for adding a new contact
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactName, setNewContactName] = useState("");

  const navigate = useNavigate();
  const scrollRef = useRef();

  // 1. Initial Load: Auth, Contacts & Socket Setup
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo) {
      navigate("/");
    } else {
      setUser(userInfo);
      fetchContacts(userInfo.token);
      
      // Initialize Socket
      socket = io(ENDPOINT);
      socket.emit("setup", userInfo);
      socket.on("connected", () => setSocketConnected(true));
    }
  }, [navigate]);

  const fetchContacts = async (token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get("/api/contacts", config);
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  // 2. Messaging Logic: Fetch Messages
  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
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
    // eslint-disable-next-line
  }, [selectedChat]);

  // 3. Socket.io: Listen for incoming messages
  useEffect(() => {
    socket.on("message received", (newMessageReceived) => {
      if (!selectedChatCompare || selectedChatCompare._id !== newMessageReceived.chat._id) {
        // Optional: Send notification if user is in another chat
      } else {
        setMessages([...messages, newMessageReceived]);
      }
    });
  });

  useEffect(() => {
  const messageHandler = (newMessageReceived) => {
    // If we are currently looking at the chat this message belongs to
    if (selectedChatCompare && selectedChatCompare._id === newMessageReceived.chat._id) {
      setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
    }
  };

  socket.on("message received", messageHandler);

  // Clean up the listener when the component updates or unmounts
  return () => {
    socket.off("message received", messageHandler);
  };
}, [messages]); // Important: dependency on messages to keep the state fresh

  // 4. Messaging Logic: Send Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (newMessage && selectedChat) {
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        const content = newMessage;
        setNewMessage(""); // Clear input early for better UI feel
        
        const { data } = await axios.post("/api/message", {
          content: content,
          chatId: selectedChat._id,
        }, config);

        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        alert("Error sending message");
      }
    }
  };

  // 5. Contact Logic: Add Contact
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactNumber || !newContactName) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post("/api/contacts", {
        phoneNumber: newContactNumber,
        contactName: newContactName
      }, config);
      setContacts([...contacts, data]);
      setNewContactNumber("");
      setNewContactName("");
      alert("Contact added!");
    } catch (error) {
      alert(error.response?.data?.message || "Error adding contact");
    }
  };

  // 6. Logic: Access/Create Chat Room
  const accessChat = async (userId) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);
      setSelectedChat(data);
    } catch (error) {
      alert("Error opening chat");
    }
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredContacts = contacts.filter((c) =>
    c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  const getOtherUser = (users) => users?.find((u) => u._id !== user?._id);

  return (
    <div className="flex h-screen bg-slate-100 antialiased text-slate-900">
      
      {/* SIDEBAR */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl">
        <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center font-bold">
              {user?.firstName?.[0]}
            </div>
            <div>
              <p className="font-bold leading-none">{user?.firstName}</p>
              <p className="text-xs text-blue-100 mt-1">Online</p>
            </div>
          </div>
          <MoreVertical size={20} className="cursor-pointer opacity-80 hover:opacity-100" />
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <form onSubmit={handleAddContact} className="flex flex-col gap-2">
            <input placeholder="Mobile Number" className="p-2 text-sm border rounded-lg" value={newContactNumber} onChange={(e) => setNewContactNumber(e.target.value)}/>
            <input placeholder="Nickname" className="p-2 text-sm border rounded-lg" value={newContactName} onChange={(e) => setNewContactName(e.target.value)}/>
            <button className="bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700">
              <UserPlus size={16} /> Save Friend
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((c) => (
            <div 
              key={c._id} 
              onClick={() => accessChat(c.contactUser._id)}
              className={`flex items-center gap-3 p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-blue-50
                ${selectedChat?.users?.some(u => u._id === c.contactUser._id) ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
            >
              <img src={c.contactUser.pic} className="w-12 h-12 rounded-full shadow-sm" alt="profile" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 truncate">{c.contactName}</h4>
                <p className="text-xs text-slate-500 truncate">{c.phoneNumber}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="hidden md:flex flex-1 flex-col relative overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <img src={getOtherUser(selectedChat.users)?.pic} className="w-10 h-10 rounded-full" alt="chat-user" />
                <div>
                  <h2 className="font-bold text-slate-800">
                    {getOtherUser(selectedChat.users)?.firstName} {getOtherUser(selectedChat.users)?.lastName}
                  </h2>
                </div>
              </div>
            </div>

            {/* Messages Display */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#e5ddd5] flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`max-w-[70%] p-3 rounded-xl text-sm shadow-sm ${
                    m.sender._id === user._id 
                    ? "bg-blue-600 text-white self-end rounded-tr-none" 
                    : "bg-white text-slate-800 self-start rounded-tl-none"
                  }`}
                >
                  <p>{m.content}</p>
                  <span className={`text-[10px] block mt-1 ${m.sender._id === user._id ? "text-blue-100" : "text-slate-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <form className="flex items-center gap-2" onSubmit={sendMessage}>
                <input 
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 p-3 bg-slate-100 rounded-xl outline-none text-sm"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center bg-slate-50 text-slate-400">
            <MessageSquare size={80} className="opacity-20 mb-4" />
            <h2 className="text-2xl font-bold">Welcome to Chat</h2>
            <p>Select a friend to start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;