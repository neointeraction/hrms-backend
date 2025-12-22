require("dotenv").config();
const mongoose = require("mongoose");
const Permission = require("../models/Permission");
const PERMISSION_HIERARCHY = require("../config/permissions");

const seedPermissions = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/hrms";
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB for Seeding Permissions");

    for (const group of PERMISSION_HIERARCHY) {
      for (const perm of group.permissions) {
        const permissionName = `${group.module}:${perm.key}`;
        // Upsert permission
        await Permission.findOneAndUpdate(
          { name: permissionName },
          {
            name: permissionName,
            description: perm.label,
            module: group.module,
          },
          { upsert: true, new: true }
        );
        console.log(`Synced: ${permissionName}`);
      }
    }

    console.log("Permissions Synced. Now updating Admin roles...");

    // 2. Fetch all permissions
    const allPermissions = await Permission.find({});
    const allPermissionIds = allPermissions.map((p) => p._id);

    // 3. Assign all permissions to Admin and Super Admin
    // Using simple updateMany could work if we overwrite.
    // Or we can find and update.
    const rolesToUpdate = ["Admin", "Super Admin", "admin", "SuperAdmin"]; // Cover potential casing

    await require("../models/Role").updateMany(
      { name: { $in: rolesToUpdate } },
      { $set: { permissions: allPermissionIds } }
    );

    console.log("Admin/Super Admin roles updated with ALL permissions.");

    console.log("All Permissions Seeded Successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedPermissions();
