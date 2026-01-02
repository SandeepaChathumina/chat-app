const Contact = require("../models/contactModel");
const User = require("../models/userModel");

const addContact = async (req, res) => {
  const { phoneNumber, contactName } = req.body;

  try {
    // 1. Check if the person we are trying to add is actually registered
    const personToJoin = await User.findOne({ mobileNumber: phoneNumber });

    if (!personToJoin) {
      return res.status(404).json({ message: "User not found with this mobile number" });
    }

    // 2. Check if already in contacts
    const alreadyContact = await Contact.findOne({ 
      user: req.user._id, 
      contactUser: personToJoin._id 
    });

    if (alreadyContact) {
      return res.status(400).json({ message: "Contact already exists" });
    }

    // 3. Save to Contact List
    const newContact = await Contact.create({
      user: req.user._id,
      contactUser: personToJoin._id,
      contactName: contactName,
      phoneNumber: phoneNumber
    });

    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.user._id }).populate("contactUser", "pic email username");
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addContact, getMyContacts };