const mongoose = require("mongoose");
const path = require("path");
const Permission = require("../models/Permission");
const Role = require("../models/Role");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const MAPPING = {
  "tasks:view": "projects:task_view",
  "tasks:create": "projects:task_create",
  "tasks:edit": "projects:task_edit",
  "tasks:delete": "projects:task_delete",
  "tasks:assign": "projects:task_assign",
};

const start = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    // 1. Rename Permissions
    console.log("Renaming permissions...");
    for (const [oldName, newName] of Object.entries(MAPPING)) {
      const perm = await Permission.findOne({ name: oldName });
      if (perm) {
        perm.name = newName;
        await perm.save();
        console.log(`Renamed ${oldName} -> ${newName}`);
      } else {
        // Check if new name already exists (maybe run before)
        const newPerm = await Permission.findOne({ name: newName });
        if (newPerm) {
          console.log(`${newName} already exists.`);
        } else {
          // Create if neither exist (fallback)
          await Permission.create({ name: newName });
          console.log(`Created ${newName}`);
        }
      }
    }

    // 2. Update Roles accessibleModules
    console.log("Updating Roles accessibleModules...");
    const roles = await Role.find({ accessibleModules: "tasks" });
    for (const role of roles) {
      // Remove 'tasks'
      role.accessibleModules = role.accessibleModules.filter(
        (m) => m !== "tasks"
      );

      // Ensure 'projects' is present
      if (!role.accessibleModules.includes("projects")) {
        role.accessibleModules.push("projects");
      }

      await role.save();
      console.log(`Updated role: ${role.name}`);
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
