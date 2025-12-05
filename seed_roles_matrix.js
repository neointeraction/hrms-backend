const mongoose = require("mongoose");
const Role = require("./models/Role");
const Permission = require("./models/Permission");
require("dotenv").config();

const roleMatrix = {
  admin: ["*"], // All permissions
  hr: [
    "employee:create",
    "employee:read",
    "employee:update",
    "employee:delete",
    "payroll:view_edit",
    "attendance:manage",
    "document:manage",
    "asset:manage",
    "report:view_all",
    "task:view_all",
    "ticket:manage",
  ],
  accountant: [
    "employee:read",
    "payroll:manage",
    "attendance:view_all",
    "document:view_payroll",
    "asset:view_all",
    "report:view_all",
    "ticket:manage",
  ],
  pm: [
    "employee:read",
    "payroll:view_team",
    "attendance:approve_team",
    "document:view_team",
    "asset:approve_team",
    "report:view_team",
    "task:manage",
    "ticket:view_team",
  ],
  employee: [
    "employee:read_self",
    "employee:update_self",
    "payroll:view_self",
    "attendance:manage_self",
    "document:manage_self",
    "asset:view_all",
    "report:view_self",
    "task:view_assigned",
    "ticket:manage_self",
  ],
  intern: [
    "employee:read_self",
    "employee:update_self",
    // No payroll
    "attendance:manage_self",
    "document:manage_self",
    "asset:view_all",
    "report:view_self",
    "task:view_assigned",
    "ticket:manage_self",
  ],
  consultant: [
    "employee:read_self",
    "employee:update_self",
    // No payroll
    "attendance:manage_self",
    "document:manage_self",
    "asset:view_all",
    "report:view_self",
    "task:view_assigned",
    "ticket:manage_self",
  ],
};

async function seedRolesMatrix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const allPermissions = await Permission.find();
    const permMap = allPermissions.reduce((acc, p) => {
      acc[p.name] = p._id;
      return acc;
    }, {});

    for (const [roleName, permNames] of Object.entries(roleMatrix)) {
      let rolePermIds = [];

      if (permNames.includes("*")) {
        rolePermIds = allPermissions.map((p) => p._id);
      } else {
        rolePermIds = permNames
          .map((name) => {
            if (!permMap[name])
              console.warn(
                `Warning: Permission '${name}' not found for role '${roleName}'`
              );
            return permMap[name];
          })
          .filter((id) => id);
      }

      // Update the role
      await Role.findOneAndUpdate(
        { name: roleName },
        { permissions: rolePermIds },
        { new: true, upsert: true } // Create if not exists (though we expect them to exist)
      );
      console.log(`Updated permissions for role: ${roleName}`);
    }

    console.log("Role matrix seeding complete");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedRolesMatrix();
