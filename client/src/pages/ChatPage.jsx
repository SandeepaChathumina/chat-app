import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlus, Search, MessageSquare, Send, MoreVertical, Phone, Video } from "lucide-react";

const ChatPage = () => {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  
  // States for adding a new contact
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactName, setNewContactName] = useState("");

  const navigate = useNavigate();

  // 1. Initial Load: Auth & Contacts
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo) {
      navigate("/");
    } else {
      setUser(userInfo);
      fetchContacts(userInfo.token);
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

  // 2. Logic: Add a new contact to DB
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
      alert("Contact added successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "User not found");
    }
  };

  // 3. Logic: Access/Create Chat Room
  const accessChat = async (userId) => {

    // Add a console.log here to see if the ID is actually being passed
  console.log("Attempting to access chat with ID:", userId); 

  if (!userId) {
    alert("User ID is missing");
    return;
  }

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

  // 4. Logic: Filter existing contacts
  const filteredContacts = contacts.filter((c) =>
    c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  // Helper to get the other user's data from a chat object
  const getOtherUser = (users) => {
    return users?.find((u) => u._id !== user?._id);
  };

  return (
    <div className="flex h-screen bg-slate-100 antialiased text-slate-900">
      
      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl">
        
        {/* User Header */}
        <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center font-bold">
              {user?.firstName?.[0]}
            </div>
            <div>
              <p className="font-bold leading-none">{user?.firstName}</p>
              <p className="text-xs text-blue-100 mt-1">My Account</p>
            </div>
          </div>
          <MoreVertical size={20} className="cursor-pointer opacity-80 hover:opacity-100" />
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Add Contact Section */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Add Connection</h3>
          <form onSubmit={handleAddContact} className="flex flex-col gap-2">
            <input 
              placeholder="Mobile Number" 
              className="p-2 text-sm border rounded-lg"
              value={newContactNumber}
              onChange={(e) => setNewContactNumber(e.target.value)}
            />
            <input 
              placeholder="Nickname" 
              className="p-2 text-sm border rounded-lg"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
            />
            <button className="bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
              <UserPlus size={16} /> Save Friend
            </button>
          </form>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest p-4 pb-0">Your Friends</h3>
          {filteredContacts.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No friends found.</div>
          ) : (
            filteredContacts.map((c) => (
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
                <div className="text-[10px] text-slate-400">12:45</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="hidden md:flex flex-1 flex-col relative overflow-hidden">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <img src={getOtherUser(selectedChat.users)?.pic} className="w-10 h-10 rounded-full" alt="chat-user" />
                <div>
                  <h2 className="font-bold text-slate-800">
                    {getOtherUser(selectedChat.users)?.firstName} {getOtherUser(selectedChat.users)?.lastName}
                  </h2>
                  <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <Phone size={20} className="hover:text-blue-600 cursor-pointer transition" />
                <Video size={20} className="hover:text-blue-600 cursor-pointer transition" />
                <MoreVertical size={20} className="hover:text-blue-600 cursor-pointer transition" />
              </div>
            </div>

            {/* Messages Display */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#e5ddd5] pattern-bg flex flex-col gap-3">
               <div className="self-center bg-white/80 backdrop-blur shadow-sm text-slate-500 text-[11px] px-3 py-1 rounded-lg font-semibold uppercase">
                  End-to-End Encrypted
               </div>
               {/* Messages mapping goes here later */}
               <div className="p-10 text-center text-slate-500">
                  <p className="bg-white/50 inline-block px-4 py-2 rounded-full">No messages yet. Send a greeting!</p>
               </div>
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <form className="flex items-center gap-2 max-w-4xl mx-auto" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="text"
                  placeholder="Write your message..."
                  className="flex-1 p-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 hover:scale-105 transition active:scale-95 shadow-lg shadow-blue-200">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col justify-center items-center bg-slate-50">
            <div className="bg-white p-12 rounded-full shadow-2xl shadow-blue-100 mb-6">
              <MessageSquare size={80} className="text-blue-200" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">MERN Chat App</h2>
            <p className="text-slate-500 text-center max-w-sm px-4">
              Connect with your friends instantly. Search for a contact or add a new friend to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;