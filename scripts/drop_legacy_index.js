const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hrms_db";

const dropIndex = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.collection("users");

    // Check if index exists
    const indexes = await collection.indexes();
    const indexExists = indexes.some((idx) => idx.name === "employeeId_1");

    if (indexExists) {
      console.log("Found legacy index 'employeeId_1'. Dropping...");
      await collection.dropIndex("employeeId_1");
      console.log("✅ Successfully dropped index 'employeeId_1'");
    } else {
      console.log(
        "ℹ️ Index 'employeeId_1' not found. It might have been already dropped."
      );
    }

    console.log("Current Indexes on 'users' collection:");
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach((idx) => console.log(` - ${idx.name}`));
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected");
    process.exit(0);
  }
};

dropIndex();
