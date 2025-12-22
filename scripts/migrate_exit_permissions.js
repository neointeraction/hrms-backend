const mongoose = require("mongoose");
const path = require("path");
const Permission = require("../models/Permission");
const Role = require("../models/Role");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const start = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    // 1. Resolve Permissions
    const oldPermName = "exit_management:manage_policies";
    const newPermName = "exit_management:manage";

    let oldPerm = await Permission.findOne({ name: oldPermName });
    let newPerm = await Permission.findOne({ name: newPermName });

    if (!newPerm) {
      console.log(`Creating new permission: ${newPermName}`);
      newPerm = await Permission.create({ name: newPermName });
    }

    if (oldPerm) {
      console.log("Updating Roles that have the old permission...");

      // Update Roles: Replace oldPerm._id with newPerm._id
      const roles = await Role.find({ permissions: oldPerm._id });

      for (const role of roles) {
        // Filter out old ID and add new ID
        const newPermissions = role.permissions.filter(
          (pId) => pId.toString() !== oldPerm._id.toString()
        );
        newPermissions.push(newPerm._id);

        // Ensure uniqueness (IDs are objects, need careful check or stringify)
        const uniquePermissions = [
          ...new Set(newPermissions.map((id) => id.toString())),
        ];

        role.permissions = uniquePermissions;
        await role.save();
        console.log(`Updated role: ${role.name}`);
      }

      console.log("Deleting old permission...");
      await Permission.deleteOne({ _id: oldPerm._id });
    } else {
      console.log("Old permission not found, skipping role update.");
    }

    // 3. Ensure Designation permissions exist (just in case)
    const designationPerms = ["designations:view", "designations:manage"];
    for (const name of designationPerms) {
      const exists = await Permission.findOne({ name });
      if (!exists) {
        await Permission.create({ name });
        console.log(`Created permission: ${name}`);
      }
    }

    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
