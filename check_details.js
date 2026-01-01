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
      const employee = await Employee.findOne({ email }).lean();
      if (employee) {
        console.log("--- Employee Found ---");
        console.log("Email:", employee.email);
        console.log("Personal Mobile:", employee.personalMobile);
        console.log("Mobile (raw check):", employee.mobile); // Check if it leaked in
        console.log("Present Address:", employee.presentAddress);
        console.log("Address (raw check):", employee.address);
        console.log(
          "Documents:",
          JSON.stringify(employee.onboarding?.documents, null, 2)
        );
        console.log(
          "Bank Details:",
          JSON.stringify(employee.bankDetails, null, 2)
        );

        // Check if data is hiding in 'onboarding.personalDetails.data' or similar if I used that?
        // Schema has: personalDetails: { data: Mixed }
        console.log(
          "Onboarding Personal Details Data:",
          JSON.stringify(employee.onboarding?.personalDetails, null, 2)
        );
      } else {
        console.log("Employee NOT found.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch((err) => console.error(err));
