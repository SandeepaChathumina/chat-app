const mongoose = require("mongoose");

const contactSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The person who is saving the contact
    contactUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The person being saved
    contactName: { type: String, required: true }, // The nickname (e.g., "Best Friend")
    phoneNumber: { type: String, required: true }, // The mobile number for searching
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;