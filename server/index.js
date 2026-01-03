const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoute");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("API is running successfully!");
});

app.use("/api/user", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

const PORT = process.env.PORT || 3000;

// 1. Capture the server instance for Socket.io
const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// 2. Initialize Socket.io
const io = require("socket.io")(server, {
  pingTimeout: 60000, // Close connection after 60s of inactivity to save resources
  cors: {
    origin: "http://localhost:5173", // Allow your Vite frontend to connect
  },
});

// 3. Set up Socket.io connection logic
io.on("connection", (socket) => {
  console.log("Connected to socket.io ✅");

  // User joins a personal room based on their ID
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(`User ${userData.firstName} joined their personal room: ${userData._id}`);
    socket.emit("connected");
  });

  // User joins a specific Chat Room (ID of the Chat)
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Chat Room: " + room);
  });

  // When a message is sent
  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");

    // Send the message to everyone in the chat except the sender
    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.sender._id) return;

      // .in(user._id) targets that user's personal room
      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  // Handle Disconnects
  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});