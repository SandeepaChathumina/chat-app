import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '', firstName: '', lastName: '', birthday: '', email: '', mobileNumber: '', password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("/api/user/register", formData);
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/chats");
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg grid grid-cols-2 gap-4">
        <h2 className="col-span-2 text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
        <input className="col-span-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Username" onChange={(e) => setFormData({...formData, username: e.target.value})} required />
        <input className="p-3 border rounded-lg" placeholder="First Name" onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
        <input className="p-3 border rounded-lg" placeholder="Last Name" onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
        <input className="col-span-2 p-3 border rounded-lg" type="email" placeholder="Email Address" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        <input className="p-3 border rounded-lg" placeholder="Mobile Number" onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} required />
        <div className="flex flex-col">
          <label className="text-xs text-gray-400 ml-1">Birthday</label>
          <input className="p-2 border rounded-lg" type="date" onChange={(e) => setFormData({...formData, birthday: e.target.value})} required />
        </div>
        <input className="col-span-2 p-3 border rounded-lg" type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
        <button className="col-span-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">Register</button>
      </form>
    </div>
  );
};

export default RegisterPage;