const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Tenant = require("../models/Tenant");

const forceExpire = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Target the specific test tenant
    const tenantId = "695491808a6f9ce2b931a5d8";

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      console.log("Tenant not found");
      process.exit(1);
    }

    // Set subscriptionEnd to 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    tenant.subscriptionEnd = oneHourAgo;
    await tenant.save();

    console.log(
      `Force expired tenant ${tenant.companyName}. SubscriptionEnd: ${tenant.subscriptionEnd}`
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

forceExpire();
