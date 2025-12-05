const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const adminController = require("../controllers/admin.controller");
require("dotenv").config();

async function verifyDeleteUser() {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create a test user
    const user = new User({
      name: "Delete Me",
      email: "deleteme@example.com",
      passwordHash: "hash",
      status: "active",
      roles: [],
    });
    await user.save();
    console.log("Created test user:", user._id);

    // Mock Request
    const req = {
      params: { id: user._id.toString() },
    };

    // Mock Response
    const res = {
      statusCode: 200,
      jsonData: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.jsonData = data;
        return this;
      },
    };

    // Call Delete
    await adminController.deleteUser(req, res);

    // Check Response
    console.log("Response Status:", res.statusCode);
    console.log("Response Data:", res.jsonData);

    if (res.statusCode === 200) {
      // Verify in DB
      const deletedUser = await User.findById(user._id);
      if (!deletedUser) {
        console.log("SUCCESS: User deleted from DB.");
      } else {
        console.log("FAILURE: User still exists in DB.");
        // Cleanup
        await User.deleteOne({ _id: user._id });
      }
    } else {
      console.log("FAILURE: API returned error.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyDeleteUser();
