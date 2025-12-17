const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const Role = require("../models/Role");
require("dotenv").config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const email = "admin@neointeraction.com";
    const password = "Welcome@123";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let user = await User.findOne({ email });

    if (user) {
      console.log("User found, updating password...");
      user.passwordHash = passwordHash;
      await user.save();
      console.log("Password updated to:", password);
    } else {
      console.log("User not found. Creating...");
      // This part is complex because we need a tenant and role.
      // Assuming tenant exists or we pick the first one.
      const tenant = await Tenant.findOne();
      if (!tenant) throw new Error("No tenants found! Cannot create admin.");

      const role = await Role.findOne({ name: "Admin", tenantId: tenant._id });
      if (!role) throw new Error("Admin role not found!");

      user = await User.create({
        name: "Neo Admin",
        email,
        passwordHash,
        tenantId: tenant._id,
        roles: [role._id],
        status: "active",
        employeeId: "ADM001",
      });
      console.log("User created.");
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
