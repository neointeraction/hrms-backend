const mongoose = require("mongoose");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Role = require("../models/Role");
const Leave = require("../models/Leave");
const Project = require("../models/Project");
const Payroll = require("../models/Payroll");
const Task = require("../models/Task");
const Timesheet = require("../models/Timesheet");
const Holiday = require("../models/Holiday");
require("dotenv").config();

async function deleteTenant(companyName) {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test"
    );
    console.log("Connected to MongoDB\n");

    // Find the tenant
    const tenant = await Tenant.findOne({
      companyName: new RegExp(companyName, "i"),
    });

    if (!tenant) {
      console.log(`No tenant found with name: ${companyName}`);
      await mongoose.connection.close();
      return;
    }

    console.log("Found tenant:");
    console.log(`  Company: ${tenant.companyName}`);
    console.log(`  Subdomain: ${tenant.subdomain}`);
    console.log(`  Owner: ${tenant.ownerEmail}`);
    console.log(`  Plan: ${tenant.plan}`);
    console.log(`  Tenant ID: ${tenant._id}\n`);

    // Count associated data
    const tenantId = tenant._id;
    const userCount = await User.countDocuments({ tenantId });
    const employeeCount = await Employee.countDocuments({ tenantId });
    const roleCount = await Role.countDocuments({ tenantId });
    const leaveCount = await Leave.countDocuments({ tenantId });
    const projectCount = await Project.countDocuments({ tenantId });
    const payrollCount = await Payroll.countDocuments({ tenantId });
    const taskCount = await Task.countDocuments({ tenantId });
    const timesheetCount = await Timesheet.countDocuments({ tenantId });
    const holidayCount = await Holiday.countDocuments({ tenantId });

    console.log("Associated data to be deleted:");
    console.log(`  Users: ${userCount}`);
    console.log(`  Employees: ${employeeCount}`);
    console.log(`  Roles: ${roleCount}`);
    console.log(`  Leave records: ${leaveCount}`);
    console.log(`  Projects: ${projectCount}`);
    console.log(`  Payroll records: ${payrollCount}`);
    console.log(`  Tasks: ${taskCount}`);
    console.log(`  Timesheets: ${timesheetCount}`);
    console.log(`  Holidays: ${holidayCount}\n`);

    console.log("Deleting all data...\n");

    // Delete all associated data
    await User.deleteMany({ tenantId });
    console.log(`  Deleted ${userCount} users`);

    await Employee.deleteMany({ tenantId });
    console.log(`  Deleted ${employeeCount} employees`);

    await Role.deleteMany({ tenantId });
    console.log(`  Deleted ${roleCount} roles`);

    await Leave.deleteMany({ tenantId });
    console.log(`  Deleted ${leaveCount} leave records`);

    await Project.deleteMany({ tenantId });
    console.log(`  Deleted ${projectCount} projects`);

    await Payroll.deleteMany({ tenantId });
    console.log(`  Deleted ${payrollCount} payroll records`);

    await Task.deleteMany({ tenantId });
    console.log(`  Deleted ${taskCount} tasks`);

    await Timesheet.deleteMany({ tenantId });
    console.log(`  Deleted ${timesheetCount} timesheets`);

    await Holiday.deleteMany({ tenantId });
    console.log(`  Deleted ${holidayCount} holidays`);

    // Finally, delete the tenant
    await Tenant.deleteOne({ _id: tenantId });
    console.log(`\n  SUCCESS: Deleted tenant "${tenant.companyName}"`);

    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Get company name from command line
const companyName = process.argv[2] || "Neointeraction";

console.log(`Attempting to delete company: ${companyName}\n`);
deleteTenant(companyName);
