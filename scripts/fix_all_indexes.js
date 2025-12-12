const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hrms_db";

const fixIndexes = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const collections = ["users", "employees"];

    for (const colName of collections) {
      const collection = mongoose.connection.collection(colName);

      console.log(`\n--- Checking Collection: ${colName} ---`);

      const indexes = await collection.indexes();
      const legacyIndex = indexes.find((idx) => idx.name === "employeeId_1");

      if (legacyIndex) {
        console.log(
          `⚠️ Found legacy index 'employeeId_1' in '${colName}'. Dropping...`
        );
        await collection.dropIndex("employeeId_1");
        console.log(
          `✅ Successfully dropped index 'employeeId_1' from '${colName}'`
        );
      } else {
        console.log(
          `✅ Legacy index 'employeeId_1' NOT found in '${colName}'.`
        );
      }

      console.log(`Current Indexes on '${colName}':`);
      const updatedIndexes = await collection.indexes();
      updatedIndexes.forEach((idx) =>
        console.log(` - ${idx.name} : ${JSON.stringify(idx.key)}`)
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\nDisconnected");
    process.exit(0);
  }
};

fixIndexes();
