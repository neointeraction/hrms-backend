const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const Tenant = require("../models/Tenant");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hrms_db";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};

const fixPermissions = async () => {
  try {
    await connectDB();

    // 1. Get 'organization:view' permission ID
    const orgViewPerm = await Permission.findOne({ name: "organization:view" });
    if (!orgViewPerm) {
      console.error(
        "Critical Error: 'organization:view' permission not found in DB!"
      );
      process.exit(1);
    }
    console.log(`Found 'organization:view' permission ID: ${orgViewPerm._id}`);

    // 2. Roles to update
    const rolesToUpdate = [
      "Employee",
      "Intern",
      "Consultant",
      "Project Manager",
      "HR",
    ];

    // 3. Find all roles matching these names across all tenants
    const roles = await Role.find({ name: { $in: rolesToUpdate } });
    console.log(`Found ${roles.length} roles to check/update.`);

    let updatedCount = 0;

    for (const role of roles) {
      if (!role.permissions.includes(orgViewPerm._id)) {
        role.permissions.push(orgViewPerm._id);
        // Ensure unique
        role.permissions = [
          ...new Set(role.permissions.map((p) => p.toString())),
        ];

        await role.save();
        console.log(`Updated role '${role.name}' for tenant ${role.tenantId}`);
        updatedCount++;
      }
    }

    console.log(`\nOperation Complete. Updated ${updatedCount} roles.`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

fixPermissions();
