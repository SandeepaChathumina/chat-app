const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

// Import route handlers
const userRoutes = require("./routes/userRoute");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

dotenv.config();
connectDB(); // Connect to MongoDB

const app = express();

// Middleware Configuration
app.use(cors({
  origin: "http://localhost:5173", // Allow frontend requests
  credentials: true // Allow cookies/auth headers
}));
app.use(express.json()); // Parse JSON request bodies

// API Routes
app.get("/", (req, res) => {
  res.send("Chat API is running!");
});

app.use("/api/user", userRoutes); // User registration/login
app.use("/api/contacts", contactRoutes); // Contact management
app.use("/api/chat", chatRoutes); // Chat management
app.use("/api/message", messageRoutes); // Message handling

const PORT = process.env.PORT || 3000;

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Socket.io Setup for Real-time Communication
const io = require("socket.io")(server, {
  pingTimeout: 60000, // Close connection after 60s of inactivity
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Store connected users for tracking online status
const connectedUsers = new Map(); // Map<userId, socketId>

// Handle new socket connections
io.on("connection", (socket) => {
  console.log("✅ New socket connection:", socket.id);

  // 1. SETUP USER ROOM - When user logs in/connects
  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      // Store user ID with socket ID for quick lookup
      connectedUsers.set(userData._id.toString(), socket.id);
      
      // Join user's personal room (for direct messaging)
      socket.join(userData._id.toString());
      
      console.log(`👤 User ${userData.firstName} (${userData._id}) connected`);
      console.log(`📊 Total connected users: ${Array.from(connectedUsers.keys()).length}`);
      
      // Send acknowledgment to client
      socket.emit("connected");
    } else {
      console.error("❌ Invalid user data in setup");
    }
  });

  // 2. JOIN CHAT ROOM - When user opens a chat
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`💬 Socket ${socket.id} joined chat room: ${room}`);
  });

  // 3. HANDLE NEW MESSAGE - When user sends a message
  socket.on("new message", (newMessage) => {
    console.log("📨 New message received:", {
      messageId: newMessage._id,
      content: newMessage.content,
      chatId: newMessage.chat._id,
      senderId: newMessage.sender?._id
    });
    
    // Validate message data
    if (!newMessage || !newMessage.chat) {
      console.error("❌ Invalid message format");
      return;
    }
    
    const chat = newMessage.chat;
    
    if (!chat.users) {
      console.error("❌ Chat has no users");
      return;
    }

    console.log(`👥 Users in this chat:`, chat.users.map(u => ({
      id: u._id,
      name: `${u.firstName} ${u.lastName}`
    })));

    // 🔥 CRITICAL FIX: Send message to ALL users in the chat
    // This ensures real-time delivery without page refresh
    
    // Method 1: Send to individual user rooms (for direct delivery)
    chat.users.forEach((user) => {
      const userId = user._id.toString();
      const senderId = newMessage.sender?._id?.toString();
      
      // Don't send message back to sender (they already see it)
      if (userId === senderId) {
        console.log(`⏭️ Skipping sender: ${userId}`);
        return;
      }
      
      // Check if user is currently connected
      const userSocketId = connectedUsers.get(userId);
      if (userSocketId) {
        console.log(`📤 Sending to connected user: ${userId}`);
      } else {
        console.log(`⚠️ User ${userId} is offline, message will be delivered when they reconnect`);
      }
      
      // Send to user's personal room
      io.to(userId).emit("message received", newMessage);
    });
    
    // Method 2: Also send to chat room (for users who joined via "join chat")
    console.log(`📤 Broadcasting to chat room: ${chat._id}`);
    io.to(chat._id).emit("message received", newMessage);
  });

  // 4. TYPING INDICATORS (Optional - for future features)
  socket.on("typing", (room) => {
    socket.to(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.to(room).emit("stop typing");
  });

  // 5. DISCONNECTION - Clean up when user disconnects
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    
    // Remove user from connected users map
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`🗑️ Removed user ${userId} from connected users`);
        break;
      }
    }
    
    console.log(`📊 Remaining connected users: ${Array.from(connectedUsers.keys()).length}`);
  });
});