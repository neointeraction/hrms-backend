const mongoose = require("mongoose");
const Project = require("./models/Project");
const Task = require("./models/Task");
const User = require("./models/User");
const dotenv = require("dotenv");
const path = require("path");

// Load env vars
dotenv.config({ path: path.join(__dirname, "./.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env file");
  process.exit(1);
}

const debugData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB via debug script");

    // Replace this with the tenant ID from previous output if possible,
    // or try to find a user and get their tenant
    // Using the one from previous logs: 6939db0cdf1bf970e63b853a
    const tenantId = "6939db0cdf1bf970e63b853a";

    console.log(`Checking data for tenant: ${tenantId}`);

    const projects = await Project.find({ tenantId });
    console.log(`Found ${projects.length} projects.`);
    projects.forEach((p) => {
      console.log(
        `Project: ${p.name}, Status: ${p.status}, Members: ${p.members.length}, Manager: ${p.manager}`
      );
    });

    const tasks = await Task.find({ tenantId });
    console.log(`Found ${tasks.length} tasks.`);

    // Check if there are any users with Employee role
    // We assume Role model is linked
    const Role = require("../models/Role");
    const employeeRole = await Role.findOne({ name: "Employee", tenantId });
    if (employeeRole) {
      const employees = await User.countDocuments({
        role: employeeRole._id,
        tenantId,
      });
      console.log(
        `Found ${employees} users with Employee role (${employeeRole._id}).`
      );
    } else {
      console.log("Employee role not found for tenant? Checking by name only.");
      const roles = await Role.find({ name: "Employee" });
      console.log(`Global Employee roles found: ${roles.length}`);
    }
  } catch (error) {
    console.error("Error debugging data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

debugData();
