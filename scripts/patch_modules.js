const mongoose = require("mongoose");
const path = require("path");
const Tenant = require("../models/Tenant"); // Adjust path if needed
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const start = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    const newModules = [
      "designations",
      "exit_management",
      "help",
      "my_journey",
      "documents", // Ensure this is there too
    ];

    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
      if (!tenant.limits) tenant.limits = {};
      if (!tenant.limits.enabledModules) tenant.limits.enabledModules = [];

      let changed = false;
      newModules.forEach((mod) => {
        if (!tenant.limits.enabledModules.includes(mod)) {
          tenant.limits.enabledModules.push(mod);
          changed = true;
          console.log(
            `Adding ${mod} to tenant ${tenant.companyName} (${tenant._id})`
          );
        }
      });

      if (changed) {
        await tenant.save();
        console.log(`Saved tenant ${tenant._id}`);
      } else {
        console.log(`Tenant ${tenant._id} already has all modules.`);
      }
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
