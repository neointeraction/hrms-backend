const mongoose = require("mongoose");
const User = require("./models/User");
const Employee = require("./models/Employee");
const Role = require("./models/Role");
require("dotenv").config();

// This script checks which users don't have employee records and creates basic ones for them

async function linkUsersToEmployees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all users
    const users = await User.find();

    console.log(`\nFound ${users.length} users`);
    console.log("Checking employee records...\n");

    for (const user of users) {
      // Check if employee record exists
      const existingEmployee = await Employee.findOne({ user: user._id });

      if (existingEmployee) {
        console.log(`✓ ${user.email} - Employee record exists`);
      } else {
        console.log(`✗ ${user.email} - No employee record found`);

        // Create basic employee record
        // Get role name from user's role ID
        let roleName = "Employee";
        if (user.roles && user.roles.length > 0) {
          const role = await Role.findById(user.roles[0]);
          if (role) roleName = role.name;
        }

        const newEmployee = new Employee({
          user: user._id,
          firstName: user.name?.split(" ")[0] || "Employee",
          lastName: user.name?.split(" ").slice(1).join(" ") || "",
          email: user.email,
          employeeId: user.employeeId || `EMP${Date.now()}`,
          role: roleName,
          department: user.department || "General",
          designation: roleName,
          employeeStatus: "Active",
          employmentType: "Permanent",
        });

        await newEmployee.save();
        console.log(`  → Created employee record: ${newEmployee.employeeId}`);
      }
    }

    console.log("\n✓ All users now have employee records!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

linkUsersToEmployees();
