const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const allowedRoles = [
  "admin",
  "hr",
  "accountant",
  "pm",
  "employee",
  "intern",
  "consultant",
];

async function cleanupRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const result = await Role.deleteMany({ name: { $nin: allowedRoles } });
    console.log(
      `Deleted ${result.deletedCount} roles that were not in the allowed list.`
    );

    const remainingRoles = await Role.find({}, "name");
    console.log(
      "Remaining roles:",
      remainingRoles.map((r) => r.name)
    );

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanupRoles();
