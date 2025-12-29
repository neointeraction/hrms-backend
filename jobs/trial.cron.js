const cron = require("node-cron");
const Tenant = require("../models/Tenant");

// Run every day at midnight
const initTrialCron = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running Daily Trial Expiration Check...");
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Find tenants that are in 'trial' status and started more than 1 day ago
      const expiredTenants = await Tenant.find({
        status: "trial",
        subscriptionStart: { $lte: oneDayAgo },
      });

      if (expiredTenants.length === 0) {
        console.log("No expired trials found.");
        return;
      }

      console.log(
        `Found ${expiredTenants.length} expired trials. Deactivating...`
      );

      for (const tenant of expiredTenants) {
        tenant.status = "expired";
        await tenant.save();
        console.log(
          `Tenant ${tenant.companyName} (${tenant._id}) marked as expired.`
        );

        // Optional: Send email notification here
      }
    } catch (err) {
      console.error("Error in Trial Expiration Cron:", err);
    }
  });

  console.log("Trial Expiration Cron Initialized (Running Daily at 00:00)");
};

module.exports = { initTrialCron };
