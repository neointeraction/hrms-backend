const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const listRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const roles = await Role.find({});
    console.log(
      "Found roles:",
      roles.map((r) => ({
        name: r.name,
        tenantId: r.tenantId,
        modules: r.accessibleModules,
      }))
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

listRoles();
