const mongoose = require("mongoose");
const Project = require("./models/Project");
const User = require("./models/User");
const dotenv = require("dotenv");
dotenv.config();

const debugData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = "sam@neointeraction.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found");
      return;
    }

    console.log("Tenant ID:", user.tenantId);

    const projects = await Project.find({ tenantId: user.tenantId });
    console.log("Total Projects found:", projects.length);
    projects.forEach((p) =>
      console.log(
        `- Project: ${p.name}, Status: '${p.status}', Client: '${p.clientName}'`
      )
    );

    // Check clients
    const clients = await Project.distinct("client", {
      tenantId: user.tenantId,
    });
    console.log("Unique Clients:", clients);

    // Check Payroll
    const Payroll = require("./models/Payroll");
    const payrolls = await Payroll.find({ tenantId: user.tenantId });
    console.log("Total Payrolls found:", payrolls.length);
    if (payrolls.length > 0) {
      console.log("Sample Payroll:", JSON.stringify(payrolls[0], null, 2));
      const paidPayrolls = payrolls.filter((p) => p.status === "Paid");
      console.log("Paid Payrolls count:", paidPayrolls.length);
      paidPayrolls.forEach((p) =>
        console.log(
          `- Month: '${p.month}', Year: ${p.year}, Net: ${p.netSalary}`
        )
      );
    } else {
      console.log("No payrolls found for this tenant.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.connection.close();
  }
};

debugData();
