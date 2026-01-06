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
connectDB(); // Connect to MongoDB database

const app = express();

// Middleware Configuration
app.use(cors({
  origin: "http://localhost:5173", // Allow requests from frontend
  credentials: true // Allow cookies/auth headers
}));
app.use(express.json()); // Parse JSON request bodies

// API Routes
app.get("/", (req, res) => {
  res.send("Chat API is running!");
});

// Mount API routes
app.use("/api/user", userRoutes); // User registration/login routes
app.use("/api/contacts", contactRoutes); // Contact management routes
app.use("/api/chat", chatRoutes); // Chat management routes
app.use("/api/message", messageRoutes); // Message handling routes

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

// 🔥 FIX: Store connected users for tracking and debugging
// Map<userId, socketId> - Tracks which users are connected with which socket
const connectedUsers = new Map();

// Handle new socket connections
io.on("connection", (socket) => {
  console.log("✅ New socket connection:", socket.id);

  // 1. SETUP USER ROOM - Called when user logs in/connects
  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      // Store user ID with socket ID for quick lookup
      connectedUsers.set(userData._id.toString(), socket.id);
      
      // Join user's personal room (for direct messaging)
      socket.join(userData._id.toString());
      
      console.log(`👤 User ${userData.firstName} (${userData._id}) joined personal room`);
      console.log(`📊 Total connected users: ${Array.from(connectedUsers.keys()).length}`);
      
      // Send acknowledgment to client
      socket.emit("connected");
    } else {
      console.error("❌ Invalid user data in setup");
    }
  });

  // 2. JOIN CHAT ROOM - Called when user opens a chat
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`💬 Socket ${socket.id} joined chat room: ${room}`);
  });

  // 3. HANDLE NEW MESSAGE - Called when user sends a message
  socket.on("new message", (newMessage) => {
    console.log("📨 [SERVER] New message event received");
    console.log("   Message ID:", newMessage._id);
    console.log("   Content:", newMessage.content);
    console.log("   Chat ID:", newMessage.chat._id);
    console.log("   Sender ID:", newMessage.sender?._id);
    
    // 🔥 VALIDATION: Check if message data is complete
    if (!newMessage || !newMessage.chat) {
      console.error("❌ Invalid message format");
      return;
    }
    
    const chat = newMessage.chat;
    
    if (!chat.users || !Array.isArray(chat.users)) {
      console.error("❌ Chat has no users array");
      return;
    }

    // 🔥 DEBUG: Show all users in this chat
    console.log(`👥 Users in chat ${chat._id}:`);
    chat.users.forEach(user => {
      console.log(`   - ${user._id} (${user.firstName} ${user.lastName})`);
    });

    // 🔥 CRITICAL FIX: Send message to ALL users in the chat (except sender)
    // This ensures real-time delivery without page refresh
    
    chat.users.forEach((user) => {
      const userId = user._id.toString();
      const senderId = newMessage.sender?._id?.toString();
      
      // Don't send message back to sender (they already see it)
      if (userId === senderId) {
        console.log(`⏭️ Skipping sender: ${userId}`);
        return;
      }
      
      console.log(`📤 Attempting to send to user ${userId}:`);
      
      // Check if user is currently connected
      const userSocketId = connectedUsers.get(userId);
      if (userSocketId) {
        console.log(`   ✅ User is connected (socket: ${userSocketId})`);
        
        // 🔥 METHOD 1: Send to user's personal room (most reliable)
        io.to(userId).emit("message received", newMessage);
        console.log(`   📨 Sent to user's personal room: ${userId}`);
      } else {
        console.log(`   ⚠️ User ${userId} is offline - message will be delivered when they reconnect`);
      }
    });
    
    // 🔥 METHOD 2: Also send to chat room (for users who joined via "join chat")
    console.log(`📤 Broadcasting to chat room: ${chat._id}`);
    
    // Debug: Show how many sockets are in this chat room
    const chatRoom = io.sockets.adapter.rooms.get(chat._id);
    if (chatRoom) {
      console.log(`   👥 ${chatRoom.size} socket(s) in chat room ${chat._id}`);
    } else {
      console.log(`   ⚠️ No sockets in chat room ${chat._id}`);
    }
    
    // Emit to chat room
    io.to(chat._id).emit("message received", newMessage);
    console.log(`   ✅ Message broadcasted to chat room ${chat._id}`);
    
    console.log("📨 [SERVER] Message broadcast complete\n");
  });

  // 4. TYPING INDICATORS (Optional - for future features)
  socket.on("typing", (room) => {
    socket.to(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.to(room).emit("stop typing");
  });

  // 5. DISCONNECTION HANDLER - Clean up when user disconnects
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
  
  // 🔥 DEBUG ENDPOINT: For troubleshooting from frontend
  socket.on("debug", (data) => {
    console.log("🔍 [DEBUG] Request from client:");
    console.log("   Socket ID:", socket.id);
    console.log("   User ID:", data.userId);
    console.log("   Chat ID:", data.chatId);
    
    // Check which rooms this socket is in
    const rooms = Array.from(socket.rooms);
    console.log("   Rooms socket is in:", rooms);
    console.log("   Is in chat room?", rooms.includes(data.chatId));
    
    // Send debug info back to client
    socket.emit("debug_response", {
      socketId: socket.id,
      rooms: rooms,
      isInChatRoom: rooms.includes(data.chatId),
      connectedUsersCount: connectedUsers.size
    });
  });
});