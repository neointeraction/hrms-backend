const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // 1. Check if Super Admin user already exists
    const existingSuperAdmin = await User.findOne({ isSuperAdmin: true });
    if (existingSuperAdmin) {
      console.log("Super Admin user already exists:");
      console.log(`  Email: ${existingSuperAdmin.email}`);
      console.log(`  Name: ${existingSuperAdmin.name}`);
      process.exit(0);
    }

    // 2. Create Super Admin role (platform-level, no tenantId)
    let superAdminRole = await Role.findOne({
      name: "Super Admin",
      tenantId: null,
    });

    if (!superAdminRole) {
      superAdminRole = new Role({
        name: "Super Admin",
        tenantId: null, // Platform-level role
        permissions: [], // Super Admin has all permissions by default
      });
      await superAdminRole.save();
      console.log("✓ Created Super Admin role");
    } else {
      console.log("✓ Super Admin role already exists");
    }

    // 3. Create Super Admin user
    const defaultEmail = "superadmin@hrms.com";
    const defaultPassword = "SuperAdmin@123"; // CHANGE THIS IN PRODUCTION!
    const defaultName = "Super Admin";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const superAdmin = new User({
      name: defaultName,
      email: defaultEmail,
      passwordHash,
      isSuperAdmin: true,
      isCompanyAdmin: false,
      tenantId: null, // No tenant for Super Admin
      status: "active",
      roles: [superAdminRole._id],
    });

    await superAdmin.save();

    console.log("\n✅ Super Admin user created successfully!");
    console.log("=".repeat(50));
    console.log("📧 Email:", defaultEmail);
    console.log("🔑 Password:", defaultPassword);
    console.log("=".repeat(50));
    console.log("⚠️  IMPORTANT: Change the password after first login!");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Super Admin:", error);
    process.exit(1);
  }
};

seedSuperAdmin();
