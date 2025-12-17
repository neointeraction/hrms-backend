const mongoose = require("mongoose");
const User = require("./models/User");
const Role = require("./models/Role");
require("dotenv").config();

const ALL_MODULES = [
  "employees",
  "roles",
  "assets",
  "ai_chatbot",
  "audit",
  "leave",
  "attendance",
  "payroll",
  "projects",
  "organization",
  "feedback",
  "social",
  "email_automation",
  "tasks",
  "timesheet",
  "shifts",
  "attendance",
  "policies",
  "documents",
];

async function grantAllModules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Hardcoded email from context or finding the first company admin
    const email = "shameer@neointeraction.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found: " + email);
      return;
    }

    if (!user.tenantId) {
      console.log("User has no Tenant ID");
      return;
    }

    console.log("Updating roles for Tenant:", user.tenantId);

    // Update ALL roles for this tenant to have ALL modules
    const result = await Role.updateMany(
      { tenantId: user.tenantId },
      { $set: { accessibleModules: ALL_MODULES } }
    );

    console.log(`Updated ${result.modifiedCount} roles.`);
    console.log("All roles now have access to:", ALL_MODULES);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

grantAllModules();
