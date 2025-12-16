const mongoose = require("mongoose");
const User = require("./models/User");
const Employee = require("./models/Employee");
const Tenant = require("./models/Tenant");
require("dotenv").config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const emails = ["hr@neointeraction.com", "liyaa@neointeraction.com"];

    for (const email of emails) {
      console.log(`\n--- Checking ${email} ---`);

      const user = await User.findOne({ email });
      if (user) {
        console.log("User found:", {
          _id: user._id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          roles: user.roles,
          employeeId: user.employeeId,
          status: user.status,
        });
      } else {
        console.log("User NOT found");
      }

      const employee = await Employee.findOne({ email });
      if (employee) {
        console.log("Employee found:", {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          user: employee.user,
          tenantId: employee.tenantId,
        });

        if (user && employee.user.toString() !== user._id.toString()) {
          console.error("MISMATCH: Employee points to different User!");
        }
      } else {
        console.log("Employee NOT found");
      }

      // Check if maybe there is a user with this name but different email (old email case)
      if (employee && !user) {
        const linkedUser = await User.findById(employee.user);
        if (linkedUser) {
          console.log(
            "Linked User found (via Employee) but has different email:",
            {
              _id: linkedUser._id,
              email: linkedUser.email,
            }
          );
        } else {
          console.log("Employee has a user ID but no User found!");
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

checkUsers();
