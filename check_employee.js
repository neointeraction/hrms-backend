const mongoose = require("mongoose");
require("dotenv").config();
const Employee = require("./models/Employee");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/hrms";

mongoose
  .connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB");
    try {
      const email = "mshameer237@gmail.com";
      const employee = await Employee.findOne({ email });
      if (employee) {
        console.log("Employee Found:");
        console.log("ID:", employee._id);
        console.log("Status:", employee.employeeStatus);
        console.log("Onboarding Status:", employee.onboarding?.status);
        console.log("TenantId:", employee.tenantId);
        console.log("User ID:", employee.user);
      } else {
        console.log("Employee NOT found with email:", email);
      }
    } catch (err) {
      console.error(err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch((err) => console.error(err));
