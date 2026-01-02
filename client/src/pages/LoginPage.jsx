import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("/api/user/login", { email, password });
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/chats");
    } catch (err) {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Login</h2>
        <input className="w-full p-4 mb-4 border rounded-xl" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full p-4 mb-6 border rounded-xl" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />
        <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">Sign In</button>
      </form>
    </div>
  );
};

export default LoginPage;