const Contact = require("../models/contactModel");
const User = require("../models/userModel");

// @desc    Add a new contact by phone number
// @route   POST /api/contacts
// @access  Protected
const addContact = async (req, res) => {
  const { phoneNumber, contactName } = req.body;

  try {
    // 1. Check if the person we are trying to add is actually registered
    const personToJoin = await User.findOne({ mobileNumber: phoneNumber });

    if (!personToJoin) {
      return res.status(404).json({ message: "User not found with this mobile number" });
    }

    // 2. Prevent adding yourself as a contact
    if (personToJoin._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot add yourself as a contact" });
    }

    // 3. Check if they are already in your contact list
    const alreadyContact = await Contact.findOne({ 
      user: req.user._id, 
      contactUser: personToJoin._id 
    });

    if (alreadyContact) {
      return res.status(400).json({ message: "Contact already exists in your list" });
    }

    // 4. Create the new contact
    const newContact = await Contact.create({
      user: req.user._id,
      contactUser: personToJoin._id,
      contactName: contactName,
      phoneNumber: phoneNumber
    });

    // 5. FIX: Populate 'contactUser' details immediately so the frontend 
    // can open a chat room without needing a page refresh.
    const fullContact = await Contact.findById(newContact._id)
      .populate("contactUser", "firstName lastName pic email mobileNumber");

    res.status(201).json(fullContact); 

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all saved contacts for the logged-in user
// @route   GET /api/contacts
// @access  Protected
const getMyContacts = async (req, res) => {
  try {
    // Find all contacts where 'user' is the logged-in user
    // We populate 'contactUser' to get the actual profile details
    const contacts = await Contact.find({ user: req.user._id })
      .populate("contactUser", "firstName lastName pic email mobileNumber")
      .sort({ createdAt: -1 }); // Show newest contacts first

    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addContact, getMyContacts };