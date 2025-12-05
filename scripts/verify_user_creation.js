const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const authController = require("../controllers/auth.controller");
require("dotenv").config();

async function verifyUserCreation() {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Ensure roles exist
    let adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      adminRole = await new Role({ name: "admin", permissions: [] }).save();
      console.log("Created admin role");
    }

    // Mock Request
    const req = {
      body: {
        name: "Test User",
        email: "testuser@example.com",
        password: "password123",
        role: "admin",
        status: "inactive",
        employeeId: "EMP_TEST_001",
        department: "Engineering",
      },
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

    // Call Register
    await authController.register(req, res);

    // Check Response
    console.log("Response Status:", res.statusCode);
    console.log("Response Data:", res.jsonData);

    if (res.statusCode === 201) {
      // Verify in DB
      const user = await User.findOne({
        email: "testuser@example.com",
      }).populate("roles");
      if (user) {
        console.log("User found in DB:");
        console.log("Name:", user.name);
        console.log("Status:", user.status);
        console.log(
          "Roles:",
          user.roles.map((r) => r.name)
        );

        if (
          user.name === "Test User" &&
          user.status === "inactive" &&
          user.roles.some((r) => r.name === "admin")
        ) {
          console.log("SUCCESS: User created with correct fields.");
        } else {
          console.log("FAILURE: User fields incorrect.");
        }

        // Cleanup
        await User.deleteOne({ _id: user._id });
        console.log("Test user deleted.");
      } else {
        console.log("FAILURE: User not found in DB.");
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

verifyUserCreation();
