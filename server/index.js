const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db"); // Adjust path if needed

const userRoutes = require("./routes/userRoute");

dotenv.config();
connectDB(); // Connect to MongoDB


const app = express();

// Middleware to parse JSON (Important for APIs!)
app.use(express.json());

// 1. Health Check Route
app.get("/", (req, res) => {
  res.send("API is running successfully!");
});

app.use(express.json()); // To accept JSON data

app.use("/api/user", userRoutes); // Main user route

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

