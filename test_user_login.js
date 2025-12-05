const mongoose = require("mongoose");
const User = require("./models/User");
const Role = require("./models/Role");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function testUserLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all users
    const users = await User.find().populate("roles");
    console.log("\n=== All Users ===");
    users.forEach((user) => {
      console.log(`
Email: ${user.email}
Name: ${user.name}
Employee ID: ${user.employeeId}
Status: ${user.status}
Roles: ${user.roles.map((r) => r.name).join(", ")}
Has Password Hash: ${user.passwordHash ? "Yes" : "No"}
Password Hash Length: ${user.passwordHash?.length || 0}
      `);
    });

    // Test password for a specific user
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n=== Testing Password for ${testUser.email} ===`);

      // Try common test passwords
      const testPasswords = [
        "password",
        "Password@123",
        `${testUser.name?.split(" ").pop()}@123`,
        "admin123",
      ];

      for (const password of testPasswords) {
        const isMatch = await bcrypt.compare(password, testUser.passwordHash);
        console.log(
          `Password "${password}": ${isMatch ? "✓ MATCH" : "✗ NO MATCH"}`
        );
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testUserLogin();
