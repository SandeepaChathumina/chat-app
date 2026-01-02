import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ChatPage = () => {
  const [user, setUser] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    if (!userInfo) navigate("/"); // Redirect to home if not logged in
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r p-4">
        <h2 className="text-xl font-bold mb-4">My Chats</h2>
        <div className="text-gray-500">No recent chats...</div>
      </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
        <p className="text-2xl font-semibold">Welcome, {user?.firstName} 👋</p>
        <p>Select a user to start chatting</p>
      </div>
    </div>
  );
};

export default ChatPage;