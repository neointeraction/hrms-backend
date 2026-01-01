const mongoose = require("mongoose");
require("dotenv").config();
const Employee = require("./models/Employee");
const User = require("./models/User");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/hrms";

mongoose
  .connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB");
    try {
      const email = "mshameer237@gmail.com";
      const employee = await Employee.findOne({ email });
      if (employee) {
        console.log("Employee Status:", employee.employeeStatus);

        if (employee.user) {
          const user = await User.findById(employee.user);
          console.log("User Found:", !!user);
          if (user) {
            console.log("User Status:", user.status);

            // Fix Employee Status
            employee.employeeStatus = "Probation";
            employee.onboarding.status = "Approved";
            await employee.save();
            console.log("FIXED: Employee status updated to Probation/Approved");
          } else {
            console.log(
              "WARNING: User ID exists on Employee but User document not found."
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch((err) => console.error(err));
