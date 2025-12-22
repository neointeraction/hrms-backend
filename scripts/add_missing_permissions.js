const mongoose = require("mongoose");
const path = require("path");
const Permission = require("../models/Permission");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const newPermissions = [
  // Designation Management
  "designations:view",
  "designations:manage",

  // Exit Management
  "exit_management:view",
  "exit_management:process", // HR/Admin processing resignation
  "exit_management:manage_policies", // Admin configuring policies

  // Help Center
  "help:view",
  "help:manage", // Content editing

  // Document Management (Ensuring these exist)
  "documents:view",
  "documents:manage",
  "documents:verify",
];

const start = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    for (const name of newPermissions) {
      const exists = await Permission.findOne({ name });
      if (exists) {
        console.log(`Permission ${name} already exists.`);
      } else {
        await Permission.create({ name });
        console.log(`Created permission: ${name}`);
      }
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
