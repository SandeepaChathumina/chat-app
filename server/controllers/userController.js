const User = require("../models/userModel");


const generateToken = require("../config/generateToken");

// @desc    Register a new user
// @route   POST /api/user
// @access  Public
const registerUser = async (req, res) => {
  const { 
    username, 
    firstName, 
    lastName, 
    birthday, 
    email, 
    mobileNumber, 
    password 
  } = req.body;

  // 1. Validation: Ensure all fields are present
  if (!username || !firstName || !lastName || !birthday || !email || !mobileNumber || !password) {
    res.status(400);
    return res.json({ message: "Please enter all required fields" });
  }

  try {
    // 2. Check if user already exists (by email or username)
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (userExists) {
      res.status(400);
      return res.json({ message: "User with this email or username already exists" });
    }

    // 3. Create the user
    // Note: Password hashing happens in the Model (pre-save hook)
    const user = await User.create({
      username,
      firstName,
      lastName,
      birthday,
      email,
      mobileNumber,
      password,
    });

    if (user) {
      // 4. Respond with the user data (excluding password)
      res.status(201).json({
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age, // This is the virtual field we planned
        message: "Registration Successful!",
      });
    }
  } catch (error) {
    res.status(500);
    return res.json({ message: "Server Error: " + error.message });
  }
};

module.exports = { registerUser };







const authUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Find user by email
  const user = await User.findOne({ email });

  // 2. Check if user exists AND password matches
  // matchPassword is the function we added to the User Model earlier
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id), // Send the token to the frontend
    });
  } else {
    res.status(401);
    return res.json({ message: "Invalid Email or Password" });
  }
};

module.exports = { registerUser, authUser }; // Don't forget to export both