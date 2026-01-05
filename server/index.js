const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

// Routes
const userRoutes = require("./routes/userRoute");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Chat API is running!");
});

app.use("/api/user", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Socket.io setup
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

io.on("connection", (socket) => {
  console.log("✅ New socket connection:", socket.id);

  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      socket.join(userData._id);
      console.log(`👤 User ${userData.firstName} joined room ${userData._id}`);
      socket.emit("connected");
    } else {
      console.error("❌ Invalid user data in setup");
    }
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`💬 Socket ${socket.id} joined chat room: ${room}`);
  });

  socket.on("new message", (newMessage) => {
    console.log("📨 New message received:", newMessage);
    
    if (!newMessage || !newMessage.chat) {
      console.error("❌ Invalid message format");
      return;
    }
    
    const chat = newMessage.chat;
    
    if (!chat.users) {
      console.error("❌ Chat has no users");
      return;
    }

    // Send to all users in chat except sender
    chat.users.forEach((user) => {
      if (user._id === newMessage.sender._id) return;
      
      console.log(`📤 Sending message to user: ${user._id}`);
      socket.to(user._id).emit("message received", newMessage);
    });
    
    // Also send to the chat room
    socket.to(chat._id).emit("message received", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});