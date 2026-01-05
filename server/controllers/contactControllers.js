const Contact = require("../models/contactModel");
const User = require("../models/userModel");

// @desc    Add a new contact by phone number
// @route   POST /api/contacts
// @access  Protected
const addContact = async (req, res) => {
  const { phoneNumber, contactName } = req.body;

  console.log("📱 ADD CONTACT REQUEST:");
  console.log("- From user:", req.user._id);
  console.log("- Phone:", phoneNumber);
  console.log("- Name:", contactName);

  try {
    // Clean phone number (remove any non-digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // 1. Find the user to add by phone number
    const userToAdd = await User.findOne({ mobileNumber: cleanPhone });

    if (!userToAdd) {
      console.log("❌ No user found with phone:", cleanPhone);
      return res.status(404).json({ 
        message: "No user found with this phone number. The person needs to be registered on the app." 
      });
    }

    console.log("✅ Found user:", {
      id: userToAdd._id,
      name: `${userToAdd.firstName} ${userToAdd.lastName}`,
      phone: userToAdd.mobileNumber
    });

    // 2. Prevent adding yourself
    if (userToAdd._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: "You cannot add yourself as a contact" 
      });
    }

    // 3. Check if already in contacts
    const existingContact = await Contact.findOne({
      user: req.user._id,
      contactUser: userToAdd._id
    });

    if (existingContact) {
      return res.status(400).json({ 
        message: `${userToAdd.firstName} is already in your contacts` 
      });
    }

    // 4. Create the contact
    const contact = new Contact({
      user: req.user._id,
      contactUser: userToAdd._id,
      contactName: contactName.trim(),
      phoneNumber: cleanPhone
    });

    await contact.save();
    console.log("✅ Contact saved to database:", contact._id);

    // 5. Get the full populated contact
    const fullContact = await Contact.findById(contact._id)
      .populate("contactUser", "firstName lastName pic email mobileNumber")
      .lean(); // Convert to plain object

    console.log("✅ Contact ready to send:", {
      id: fullContact._id,
      name: fullContact.contactName,
      contactUserId: fullContact.contactUser?._id
    });

    res.status(201).json(fullContact);

  } catch (error) {
    console.error("❌ Server error adding contact:", error);
    
    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "This contact already exists in your list" 
      });
    }
    
    res.status(500).json({ 
      message: "Server error adding contact",
      error: error.message 
    });
  }
};

// @desc    Get all contacts for the logged-in user
// @route   GET /api/contacts
// @access  Protected
const getMyContacts = async (req, res) => {
  console.log("📞 GET CONTACTS for user:", req.user._id);

  try {
    // Get contacts with populated user info
    const contacts = await Contact.find({ user: req.user._id })
      .populate({
        path: "contactUser",
        select: "firstName lastName pic email mobileNumber"
      })
      .sort({ createdAt: -1 })
      .lean(); // Convert to plain objects

    console.log(`✅ Found ${contacts.length} contacts for user ${req.user._id}`);

    // Send the contacts
    res.status(200).json(contacts);

  } catch (error) {
    console.error("❌ Error fetching contacts:", error);
    res.status(500).json({ 
      message: "Server error fetching contacts",
      error: error.message 
    });
  }
};

module.exports = { addContact, getMyContacts };