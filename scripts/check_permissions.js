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

const checkPermissions = async () => {
  try {
    await connectDB();

    const orgViewPerm = await Permission.findOne({ name: "organization:view" });
    if (!orgViewPerm) {
      console.error("'organization:view' permission not found!");
      process.exit(1);
    }
    console.log(`Permission 'organization:view' ID: ${orgViewPerm._id}`);

    const roles = await Role.find({}).populate("tenantId", "name");

    console.log("\n--- Checking Roles ---");
    for (const role of roles) {
      const hasPerm = role.permissions.some(
        (p) => p.toString() === orgViewPerm._id.toString()
      );
      console.log(
        `Role: ${role.name} (${
          role.tenantId?.name || "No Tenant"
        }) - Has organization:view? ${hasPerm}`
      );
      if (
        !hasPerm &&
        ["Employee", "Intern", "Consultant", "Project Manager", "HR"].includes(
          role.name
        )
      ) {
        console.warn(`  WARNING: ${role.name} is missing the permission!`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

checkPermissions();
