const mongoose = require("mongoose");

const contactSchema = mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true
    },
    contactUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    contactName: { 
      type: String, 
      required: true,
      trim: true 
    },
    phoneNumber: { 
      type: String, 
      required: true,
      trim: true 
    },
  },
  { 
    timestamps: true
  }
);

// Add compound unique index to prevent duplicates
contactSchema.index({ user: 1, contactUser: 1 }, { unique: true });

const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;