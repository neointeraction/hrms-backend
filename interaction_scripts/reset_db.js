const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Tenant = require("../models/Tenant");
const EmailSettings = require("../models/EmailSettings");
const EmailAudit = require("../models/EmailAudit");
const AuditLog = require("../models/AuditLog");
const Leave = require("../models/Leave");
// Add other models if they exist in the codebase
// based on what I've seen: Badge, Appreciation, Notification

dotenv.config();

const runReset = async () => {
  try {
    console.log("Connecting to DB for RESET...");
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Find Super Admin to PRESERVE
    const superAdmin = await User.findOne({ isSuperAdmin: true });

    if (!superAdmin) {
      console.error(
        "CRITICAL: No Super Admin found! Aborting to prevent total lockout."
      );
      process.exit(1);
    }
    console.log(
      `PRESERVING Super Admin: ${superAdmin.email} (${superAdmin._id})`
    );

    // 2. Delete Users (except Super Admin)
    const delUsers = await User.deleteMany({ _id: { $ne: superAdmin._id } });
    console.log(`Deleted ${delUsers.deletedCount} Users.`);

    // 3. Delete All Employees
    const delEmps = await Employee.deleteMany({});
    console.log(`Deleted ${delEmps.deletedCount} Employees.`);

    // 4. Delete All Tenants
    const delTenants = await Tenant.deleteMany({});
    console.log(`Deleted ${delTenants.deletedCount} Tenants.`);

    // 5. Delete Feature Data
    const delSettings = await EmailSettings.deleteMany({});
    console.log(`Deleted ${delSettings.deletedCount} EmailSettings.`);

    const delEmailAudit = await EmailAudit.deleteMany({});
    console.log(`Deleted ${delEmailAudit.deletedCount} EmailAudits.`);

    const delAudit = await AuditLog.deleteMany({});
    console.log(`Deleted ${delAudit.deletedCount} AuditLogs.`);

    const delLeave = await Leave.deleteMany({});
    console.log(`Deleted ${delLeave.deletedCount} Leaves.`);

    // Try to delete from other collections if models are not required but collection exists
    // Using mongoose.connection.db
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const keepCollections = ["users", "roles", "permissions"]; // Keep metadata

    for (const col of collections) {
      if (
        !keepCollections.includes(col.name) &&
        ![
          "employees",
          "tenants",
          "emailsettings",
          "emailaudits",
          "auditlogs",
          "leaves",
        ].includes(col.name)
      ) {
        // These are the ones we haven't explicitly cleared yet
        try {
          await mongoose.connection.db.collection(col.name).deleteMany({});
          console.log(`Deleted all documents from collection: ${col.name}`);
        } catch (e) {
          console.log(`Failed to clear ${col.name}: ${e.message}`);
        }
      }
    }

    console.log("DATABASE RESET COMPLETE.");
    process.exit(0);
  } catch (error) {
    console.error("Reset Failed:", error);
    process.exit(1);
  }
};

runReset();
