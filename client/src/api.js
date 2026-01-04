// api.js - Make sure this is imported and used properly
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
});

// This "Interceptor" runs BEFORE every request
api.interceptors.request.use(
  (config) => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    console.log("Interceptor userInfo:", userInfo); // Debug log
    if (userInfo && userInfo.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
      console.log("Token added to headers:", config.headers.Authorization); // Debug log
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;