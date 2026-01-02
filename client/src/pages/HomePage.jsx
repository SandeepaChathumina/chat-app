import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-blue-600 to-indigo-700 text-white">
      <h1 className="text-6xl font-extrabold mb-4 tracking-tight">Connect.</h1>
      <p className="text-xl mb-8 opacity-90 text-center max-w-md">
        The real-time chat platform for modern teams and friends.
      </p>
      <div className="flex gap-4">
        <button onClick={() => navigate('/login')} className="px-8 py-3 bg-white text-blue-600 font-bold rounded-full hover:scale-105 transition-transform">
          Login
        </button>
        <button onClick={() => navigate('/register')} className="px-8 py-3 bg-transparent border-2 border-white font-bold rounded-full hover:bg-white hover:text-blue-600 transition-all">
          Join Now
        </button>
      </div>
    </div>
  );
};

export default HomePage;