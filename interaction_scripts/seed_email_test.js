const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Tenant = require("../models/Tenant");
const EmailSettings = require("../models/EmailSettings");

dotenv.config();

const runSeed = async () => {
  try {
    console.log("Connecting...");
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "admin@neointeraction.com";
    const admin = await User.findOne({ email });

    if (!admin) {
      console.error("Admin user not found. Did you create the tenant?");
      process.exit(1);
    }

    console.log(
      `Found Admin: ${admin.name}, Tenant: ${
        admin.tenantId._id || admin.tenantId
      }`
    );
    const tenantId = admin.tenantId._id || admin.tenantId; // Handle populated or not

    // 1. Create/Reset Settings
    await EmailSettings.deleteMany({ tenantId });
    await EmailSettings.create({
      tenantId: tenantId,
      birthday: {
        enabled: true,
        subject: "Happy Birthday {{employee_name}}!",
        body: "Happy Birthday!",
      },
      anniversary: {
        enabled: true,
        subject: "Happy Work Anniversary!",
        body: "Congrats!",
      },
      schedule: { enabled: true, time: "09:00" },
    });
    console.log("Created EmailSettings.");

    // 2. Create Test Employee (Birthday TODAY)
    await Employee.deleteMany({ email: "test.birthday@example.com" });
    await User.deleteMany({ email: "test.birthday@example.com" });

    // Create User first
    const testUser = await User.create({
      name: "Test Birthday",
      email: "test.birthday@example.com",
      passwordHash: "dummy", // Wont login
      tenantId: tenantId,
      status: "active",
      employeeId: "TEST001",
    });

    // Set DOB to TODAY
    const today = new Date();
    // Set year to 1990
    const dob = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    dob.setFullYear(1990);

    const emp = await Employee.create({
      user: testUser._id, // LINKED!
      firstName: "Test",
      lastName: "Birthday",
      email: "test.birthday@example.com",
      employeeId: "TEST001",
      dateOfBirth: dob,
      dateOfJoining: new Date("2020-01-01"),
      designation: "Tester",
      department: "QA",
      type: "Full-Time",
      status: "Active",
      tenantId: tenantId,
    });

    console.log(
      `Created Test Employee: ${emp.firstName} with DOB: ${emp.dateOfBirth}`
    );

    process.exit(0);
  } catch (error) {
    console.error("Seed Failed:", error);
    process.exit(1);
  }
};

runSeed();
