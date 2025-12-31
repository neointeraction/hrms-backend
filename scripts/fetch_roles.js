const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission"); // Required for population
require("dotenv").config(); // Load env vars

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hrms"; // Adjust if needed

const TENANT_ID = "693bf9ee222d38418ba3f8a4"; // Neointeraction Tenant ID

const fetchRoles = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const roles = await Role.find({ tenantId: TENANT_ID }).populate(
      "permissions"
    );

    const formattedRoles = {};

    for (const role of roles) {
      formattedRoles[role.name] = {
        description: role.description || `Default ${role.name} role`,
        modules: role.accessibleModules,
        permissions: role.permissions.map((p) => p.name),
      };
    }

    console.log(JSON.stringify(formattedRoles, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fetchRoles();
