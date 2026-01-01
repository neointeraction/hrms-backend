const mongoose = require("mongoose");
const User = require("./models/User");
const Role = require("./models/Role");
const Tenant = require("./models/Tenant");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Get Tenant (First one)
    const tenant = await Tenant.findOne();
    if (!tenant) throw new Error("No tenant found");
    const tenantId = tenant._id;

    // 2. Get Admin Role
    const adminRole = await Role.findOne({ name: "Admin", tenantId });
    if (!adminRole) throw new Error("Admin role not found");

    // 3. Create User
    const email = "agent_test_admin@example.com";
    const password = "password123";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if exists
    let user = await User.findOne({ email, tenantId });
    if (user) {
      console.log("User already exists, updating password...");
      user.passwordHash = passwordHash;
      user.roles = [adminRole._id];
      await user.save();
    } else {
      user = new User({
        name: "Test Admin Agent",
        email,
        passwordHash,
        tenantId,
        employeeId: "TEST_ADMIN_001", // Needed for unique index
        roles: [adminRole._id],
        status: "active",
      });
      await user.save();
    }

    console.log(`User created/updated: ${email} / ${password}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createTestAdmin();
