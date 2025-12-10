const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
require("dotenv").config();

async function checkEmployeeIsolation() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test"
    );
    console.log("Connected to MongoDB\n");

    // Get all tenants
    const tenants = await Tenant.find({}).select("companyName ownerEmail _id");
    console.log(`Found ${tenants.length} tenants:\n`);

    for (const tenant of tenants) {
      console.log(`\n=== ${tenant.companyName} (${tenant._id}) ===`);
      console.log(`Owner: ${tenant.ownerEmail}`);

      // Get employees for this tenant
      const employees = await Employee.find({ tenantId: tenant._id })
        .populate("user", "name email")
        .select("firstName lastName employeeId tenantId");

      console.log(`Employees (${employees.length}):`);
      employees.forEach((emp) => {
        console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
        console.log(`    Tenant ID: ${emp.tenantId}`);
        console.log(`    User: ${emp.user?.name} (${emp.user?.email})`);
      });

      // Check for cross-contamination
      const wrongEmployees = await Employee.find({
        tenantId: { $ne: tenant._id },
      }).select("firstName lastName tenantId");

      if (wrongEmployees.length > 0) {
        console.log(
          `\n  WARNING: Found ${wrongEmployees.length} employees with WRONG tenantId!`
        );
      }
    }

    // Global check - find any employees without tenantId
    const orphanEmployees = await Employee.find({ tenantId: null });
    if (orphanEmployees.length > 0) {
      console.log(
        `\n\nWARNING: Found ${orphanEmployees.length} employees WITHOUT tenantId:`
      );
      orphanEmployees.forEach((emp) => {
        console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkEmployeeIsolation();
