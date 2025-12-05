const mongoose = require("mongoose");
const Permission = require("./models/Permission");
require("dotenv").config();

const permissions = [
  // User & Role Management
  { name: "user:manage" }, // Admin
  { name: "role:manage" }, // Admin

  // Employee Records
  { name: "employee:create" }, // Admin, HR
  { name: "employee:read" }, // Admin, HR, Accountant, PM
  { name: "employee:update" }, // Admin, HR
  { name: "employee:delete" }, // Admin, HR
  { name: "employee:read_self" }, // Employee, Intern, Consultant
  { name: "employee:update_self" }, // Employee, Intern, Consultant

  // Payroll
  { name: "payroll:manage" }, // Admin, Accountant
  { name: "payroll:view_edit" }, // HR
  { name: "payroll:view_team" }, // PM
  { name: "payroll:view_self" }, // Employee

  // Attendance / Leave
  { name: "attendance:manage" }, // Admin, HR
  { name: "attendance:view_all" }, // Accountant
  { name: "attendance:approve_team" }, // PM
  { name: "attendance:manage_self" }, // Employee, Intern, Consultant

  // Documents
  { name: "document:manage" }, // Admin, HR
  { name: "document:view_payroll" }, // Accountant
  { name: "document:view_team" }, // PM
  { name: "document:manage_self" }, // Employee, Intern, Consultant

  // Asset Management
  { name: "asset:manage" }, // Admin, HR
  { name: "asset:view_all" }, // Accountant, Employee, Intern, Consultant
  { name: "asset:approve_team" }, // PM

  // Reports
  { name: "report:view_all" }, // Admin, HR, Accountant
  { name: "report:view_team" }, // PM
  { name: "report:view_self" }, // Employee, Intern, Consultant

  // Tasks / Projects
  { name: "task:manage" }, // PM
  { name: "task:view_all" }, // Admin, HR
  { name: "task:view_assigned" }, // Employee, Intern, Consultant

  // Support Tickets
  { name: "ticket:manage" }, // Admin, HR, Accountant
  { name: "ticket:view_team" }, // PM
  { name: "ticket:manage_self" }, // Employee, Intern, Consultant
];

async function seedPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const perm of permissions) {
      const existing = await Permission.findOne({ name: perm.name });
      if (!existing) {
        await Permission.create(perm);
        console.log(`Created permission: ${perm.name}`);
      } else {
        console.log(`Permission already exists: ${perm.name}`);
      }
    }

    console.log("Seeding complete");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedPermissions();
