import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlus, Search, MessageSquare } from "lucide-react"; // Icons

const ChatPage = () => {
  const [user, setUser] = useState();
  const [contacts, setContacts] = useState([]);
  const [searchNumber, setSearchNumber] = useState("");
  const [nickName, setNickName] = useState("");
  const navigate = useNavigate();

  // 1. Load User & Contacts on startup
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    if (!userInfo) {
      navigate("/");
    } else {
      fetchContacts(userInfo.token);
    }
  }, [navigate]);

  const fetchContacts = async (token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get("/api/contacts", config);
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts");
    }
  };

  // 2. Add Contact Function
  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post("/api/contacts", {
        phoneNumber: searchNumber,
        contactName: nickName
      }, config);

      setContacts([...contacts, data]);
      setSearchNumber("");
      setNickName("");
      alert("Contact saved!");
    } catch (error) {
      alert(error.response?.data?.message || "User not found");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Messages</h2>
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center uppercase">
            {user?.firstName[0]}
          </div>
        </div>

        {/* Add Contact Form */}
        <div className="p-4 border-b bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Add New Friend</p>
          <form onSubmit={handleAddContact} className="space-y-2">
            <input 
              className="w-full text-sm p-2 border rounded shadow-sm focus:outline-blue-500" 
              placeholder="Mobile Number" 
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
            />
            <input 
              className="w-full text-sm p-2 border rounded shadow-sm focus:outline-blue-500" 
              placeholder="Nickname (e.g. Mom)" 
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
            />
            <button className="w-full bg-blue-600 text-white text-sm py-2 rounded font-medium flex items-center justify-center gap-2 hover:bg-blue-700">
              <UserPlus size={16} /> Save Contact
            </button>
          </form>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-slate-500 mb-3 px-2 uppercase">My Contacts</p>
          {contacts.length === 0 ? (
            <p className="text-sm text-center text-slate-400 mt-10">No contacts yet</p>
          ) : (
            contacts.map((c) => (
              <div key={c._id} className="flex items-center gap-3 p-3 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                <img src={c.contactUser.pic} className="w-10 h-10 rounded-full bg-slate-200" alt="profile" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-800">{c.contactName}</h3>
                  <p className="text-xs text-slate-500">{c.phoneNumber}</p>
                </div>
                <MessageSquare size={16} className="text-blue-500" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
        <div className="bg-white p-10 rounded-full shadow-sm mb-4">
            <MessageSquare size={64} className="text-blue-100" />
        </div>
        <p className="text-2xl font-semibold text-slate-600">Welcome, {user?.firstName}!</p>
        <p className="text-sm">Add a friend via their mobile number to start a conversation.</p>
      </div>
    </div>
  );
};

export default ChatPage;