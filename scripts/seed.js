const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const User = require("../models/User");

dotenv.config();

const permissions = [
  "employee:view_self",
  "employee:update_self",
  "employee:view_all",
  "payroll:view_self",
  "payroll:view_all",
  "task:create",
  "task:view",
  "admin:full_access",
  "hr:user_onboard",
];

const roles = [
  {
    name: "system_admin",
    permissions: ["admin:full_access"],
  },
  {
    name: "hr_executive",
    permissions: ["employee:view_all", "hr:user_onboard", "payroll:view_all"],
  },
  {
    name: "employee",
    permissions: [
      "employee:view_self",
      "employee:update_self",
      "payroll:view_self",
      "task:create",
      "task:view",
    ],
  },
  {
    name: "intern",
    permissions: ["employee:view_self", "task:view"],
  },
];

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Permission.deleteMany({});
    await Role.deleteMany({});

    // Create Permissions
    const permissionDocs = await Permission.insertMany(
      permissions.map((name) => ({ name }))
    );
    console.log("Permissions created");

    // Map permission names to IDs
    const permissionMap = {};
    permissionDocs.forEach((p) => {
      permissionMap[p.name] = p._id;
    });

    // Create Roles
    const roleDocs = roles.map((role) => ({
      name: role.name,
      permissions: role.permissions.map((p) => permissionMap[p]),
    }));

    await Role.insertMany(roleDocs);
    console.log("Roles created");

    mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err);
    mongoose.disconnect();
  });
