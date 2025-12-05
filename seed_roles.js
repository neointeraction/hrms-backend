const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const roles = [
  { name: "admin" },
  { name: "hr" },
  { name: "accountant" },
  { name: "pm" },
  { name: "employee" },
  { name: "intern" },
  { name: "consultant" },
];

async function seedRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const role of roles) {
      const existing = await Role.findOne({ name: role.name });
      if (!existing) {
        await Role.create(role);
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    console.log("Role seeding complete");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedRoles();
