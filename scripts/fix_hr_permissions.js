const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
require("dotenv").config();

async function fixHrPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const hrRole = await Role.findOne({ name: "HR" });
    if (!hrRole) {
      console.error("HR Role not found");
      process.exit(1);
    }

    const permissionsToAdd = ["roles:view"];

    for (const permName of permissionsToAdd) {
      let permission = await Permission.findOne({ name: permName });

      if (!permission) {
        console.log(`Permission ${permName} not found, creating...`);
        // Assuming module is 'roles', description 'View Roles'
        permission = await Permission.create({
          name: permName,
          module: "roles",
          description: "View Roles",
        });
      }

      if (!hrRole.permissions.includes(permission._id)) {
        hrRole.permissions.push(permission._id);
        console.log(`Added ${permName} to HR role`);
      } else {
        console.log(`HR role already has ${permName}`);
      }
    }

    await hrRole.save();
    console.log("HR permissions updated successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixHrPermissions();
