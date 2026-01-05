const Chat = require("../models/chatModel");
const User = require("../models/userModel");

const accessChat = async (req, res) => {
  console.log("BODY RECEIVED:", req.body); // ADD THIS LINE

  const { userId } = req.body;

  if (!userId) {
    console.log("ERROR: userId was missing in the request body");
    return res.status(400).send({ message: "UserId param not sent with request" });
  }
  // ... rest of code

  // 1. Check if a chat between these two users already exists
  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "username firstName lastName email pic",
  });

  // 2. If chat exists, return it
  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    // 3. If not, create a new chat
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
};

module.exports = { accessChat };

const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    const results = await User.populate(chats, {
      path: "latestMessage.sender",
      select: "firstName lastName pic email",
    });

    res.status(200).send(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { accessChat, fetchChats }; // Add fetchChats to exports