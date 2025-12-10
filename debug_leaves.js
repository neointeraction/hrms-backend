const mongoose = require("mongoose");
const Leave = require("./models/Leave");
const Employee = require("./models/Employee");
require("dotenv").config();

const debugLeaves = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all leaves
    const leaves = await Leave.find({}).populate("employee");

    console.log(`Found ${leaves.length} total leaves.`);

    // Group by employee and printed details
    leaves.forEach((l) => {
      console.log(
        `\nEmployee: ${l.employee ? l.employee.firstName : "Unknown"}`
      );
      console.log(`Type: ${l.type}`);
      console.log(`Status: ${l.status}`);
      console.log(`TotalDays: ${l.totalDays}`);
      console.log(
        `Dates: ${l.startDate.toISOString()} to ${l.endDate.toISOString()}`
      );
      console.log(`ID: ${l._id}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

debugLeaves();
