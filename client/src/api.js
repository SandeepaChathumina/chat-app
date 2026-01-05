import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 10000, // 10 second timeout
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    
    if (userInfo && userInfo.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    } else {
      console.warn(`⚠️ API Request: ${config.method.toUpperCase()} ${config.url} - NO TOKEN`);
    }
    
    return config;
  },
  (error) => {
    console.error("❌ Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error("⏰ Request timeout");
      return Promise.reject(new Error("Request timeout. Please try again."));
    }
    
    console.error(`❌ API Error: ${error.response?.status || "No status"} ${error.config?.url || "Unknown URL"}`);
    
    if (error.response?.status === 401) {
      console.error("🔒 Authentication failed, redirecting to login...");
      localStorage.removeItem("userInfo");
      window.location.href = "/";
    }
    
    return Promise.reject(error);
  }
);

export default api;