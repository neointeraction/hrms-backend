const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const Tenant = require("../models/Tenant");

const fixTrialDates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Debug specific tenant
    const specificTenant = await Tenant.findById("695491808a6f9ce2b931a5d8");
    console.log(
      "DEBUG SPECIFIC TENANT:",
      JSON.stringify(specificTenant, null, 2)
    );

    const tenants = await Tenant.find({
      status: "trial",
      subscriptionEnd: { $exists: false },
    });

    console.log(
      `Found ${tenants.length} trial tenants without subscriptionEnd`
    );

    for (const tenant of tenants) {
      // Default to 1 day trial if not set
      const end = new Date(tenant.subscriptionStart || Date.now());
      end.setDate(end.getDate() + 1);

      tenant.subscriptionEnd = end;
      await tenant.save();
      console.log(`Updated tenant ${tenant.companyName} (${tenant._id})`);
    }

    console.log("Migration complete");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

fixTrialDates();
