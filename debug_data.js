const mongoose = require("mongoose");
require("dotenv").config();

// Define minimal schema to read data
const employeeSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    employeeStatus: String,
    onboarding: mongoose.Schema.Types.Mixed,
    tenantId: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const Employee = mongoose.model("Employee", employeeSchema);

async function checkData() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/hrms";
    console.log("Connecting to:", uri.replace(/:.*@/, ":****@")); // Mask creds
    await mongoose.connect(uri);
    console.log("Connected to DB");

    const employees = await Employee.find({});
    console.log(`Found ${employees.length} employees`);

    employees.forEach((emp) => {
      let obStatus = "N/A";
      let obType = typeof emp.onboarding;

      if (emp.onboarding && typeof emp.onboarding === "object") {
        obStatus = emp.onboarding.status || "Missing Status";
      } else if (typeof emp.onboarding === "string") {
        obStatus = "CORRUPT STRING";
      }

      console.log(`- ${emp.firstName} ${emp.lastName} (${emp.email})`);
      console.log(`  Status: "${emp.employeeStatus}"`);
      console.log(`  Onboarding: ${obType} - Status: "${obStatus}"`);
      console.log("---");
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
