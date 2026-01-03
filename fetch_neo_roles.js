const mongoose = require("mongoose");
const Tenant = require("./models/Tenant");
const Role = require("./models/Role");
const Permission = require("./models/Permission"); // Required for population
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

const fetchRoles = async () => {
  await connectDB();

  try {
    // Find neointeraction tenant
    // Assuming companyName or subdomain is 'neointeraction'
    const tenant = await Tenant.findOne({
      $or: [
        { companyName: /neointeraction/i },
        { subdomain: /neointeraction/i },
      ],
    });

    if (!tenant) {
      console.log("Tenant 'neointeraction' not found.");
      process.exit(1);
    }

    console.log(`Found Tenant: ${tenant.companyName} (${tenant._id})`);

    const roles = await Role.find({ tenantId: tenant._id }).populate(
      "permissions"
    );

    console.log("ROLES CONFIGURATION:");
    roles.forEach((r) => {
      console.log(
        JSON.stringify({
          name: r.name,
          description: r.description,
          accessibleModules: r.accessibleModules,
          permissions: r.permissions.map((p) => p.name),
        })
      );
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fetchRoles();
