const mongoose = require("mongoose");
const Shift = require("./models/Shift");
require("dotenv").config();

async function checkShifts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const shifts = await Shift.find({});

    console.log(`\nTotal shifts in database: ${shifts.length}\n`);

    if (shifts.length === 0) {
      console.log("❌ No shifts found in the database!");
      console.log("Users need to create shifts using the Add Shift button.");
    } else {
      console.log("Shifts found:");
      shifts.forEach((shift, index) => {
        console.log(`\n${index + 1}. ${shift.name}`);
        console.log(`   Tenant ID: ${shift.tenantId}`);
        console.log(`   Time: ${shift.startTime} - ${shift.endTime}`);
        console.log(`   Working Days: ${shift.workingDays.join(", ")}`);
        console.log(`   Status: ${shift.status}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkShifts();
