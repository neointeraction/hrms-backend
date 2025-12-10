const mongoose = require("mongoose");
const Employee = require("../models/Employee");
require("dotenv").config();

async function findOrphanEmployees() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test"
    );
    console.log("Connected to MongoDB\n");

    // Find employees with null or undefined tenantId
    const orphans = await Employee.find({
      $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
    }).populate("user", "name email");

    console.log(`Employees without tenantId: ${orphans.length}\n`);

    if (orphans.length > 0) {
      orphans.forEach((emp, index) => {
        console.log(
          `${index + 1}. ${emp.firstName} ${emp.lastName} (${emp.employeeId})`
        );
        console.log(`   ID: ${emp._id}`);
        console.log(`   tenantId: ${emp.tenantId}`);
        console.log(`   User: ${emp.user?.name} (${emp.user?.email})`);
        console.log("");
      });

      console.log("\nThese employees will appear in ALL companies!");
      console.log("You should either:");
      console.log(
        "1. Delete them: db.employees.deleteMany({ tenantId: null })"
      );
      console.log("2. Assign them to a tenant");
    } else {
      console.log("No orphan employees found.");
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

findOrphanEmployees();
