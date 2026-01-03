const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const dotenv = require("dotenv");
const path = require("path");

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env file");
  process.exit(1);
}

const fixPermissions = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB via fix script");

    const permissionsToAdd = ["projects:view", "projects:task_view"];
    const permissionIds = [];

    // 1. Resolve Permission ObjectIds
    for (const permName of permissionsToAdd) {
      let perm = await Permission.findOne({ name: permName });
      if (!perm) {
        perm = new Permission({ name: permName });
        await perm.save();
        console.log(`Created new permission reference: ${permName}`);
      } else {
        console.log(`Found existing permission reference: ${permName}`);
      }
      permissionIds.push(perm._id);
    }

    // 2. Find all 'Employee' roles
    const employeeRoles = await Role.find({ name: "Employee" });
    console.log(`Found ${employeeRoles.length} Employee roles.`);

    for (const role of employeeRoles) {
      console.log(`Checking role: ${role.name} (ID: ${role._id})`);

      let updated = false;
      for (const permId of permissionIds) {
        if (!role.permissions.includes(permId)) {
          role.permissions.push(permId);
          updated = true;
          console.log(`  -> Added permission ID: ${permId}`);
        }
      }

      if (updated) {
        await role.save();
        console.log(`  -> Saved updates for role ${role._id}`);
      } else {
        console.log(`  -> No updates needed.`);
      }
    }

    console.log("Permission update complete.");
  } catch (error) {
    console.error("Error fixing permissions:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

fixPermissions();
