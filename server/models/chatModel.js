const mongoose = require("mongoose");

const chatSchema = mongoose.Schema(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    // This array holds the IDs of the people in the chat
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // This references the most recent message so we can show a preview in the sidebar
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    // Only used if isGroupChat is true
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // This automatically creates "createdAt" and "updatedAt"
  }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;