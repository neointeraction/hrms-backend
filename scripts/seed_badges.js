const mongoose = require("mongoose");
const Appreciation = require("../models/Appreciation");
const Employee = require("../models/Employee");
const Badge = require("../models/Badge");
const User = require("../models/User");
require("dotenv").config(); // Assumes .env is in root

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // 1. Find a Badge (or create one)
    let badge = await Badge.findOne();
    if (!badge) {
      console.log("No badges found. Creating one...");
      badge = await Badge.create({
        title: "Star Performer",
        icon: "star.png",
        description: "For outstanding performance",
        category: "Performance",
      });
    }
    console.log("Using Badge:", badge.title);

    // 2. Find Employees
    const employees = await Employee.find().limit(2);
    // Give EVERYONE a badge to be safe
    if (employees.length > 0) {
      for (const emp of employees) {
        const app = await Appreciation.create({
          tenantId: emp.tenantId,
          sender: employees[0]._id, // First employee sends to everyone
          recipient: emp._id,
          badge: badge._id,
          message: `Test badge for ${emp.firstName}`,
        });
        console.log("Created badge for:", emp.firstName, "User ID:", emp.user);
      }
    } else {
      console.log("No employees found to give badges to.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
};

seed();
