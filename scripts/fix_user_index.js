const mongoose = require("mongoose");
require("dotenv").config();

async function fixUserIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test"
    );
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Drop the old employeeId index
    try {
      await usersCollection.dropIndex("employeeId_1");
      console.log("✅ Dropped old employeeId index");
    } catch (error) {
      if (error.code === 27) {
        console.log(
          "⚠️  Index employeeId_1 does not exist (already dropped or never created)"
        );
      } else {
        throw error;
      }
    }

    // Create new sparse unique index
    await usersCollection.createIndex(
      { employeeId: 1 },
      { unique: true, sparse: true }
    );
    console.log("✅ Created new sparse unique index on employeeId");

    // List all indexes to verify
    const indexes = await usersCollection.indexes();
    console.log("\n📋 Current indexes on users collection:");
    indexes.forEach((idx) => {
      console.log(
        `  - ${idx.name}:`,
        idx.key,
        idx.unique ? "(unique)" : "",
        idx.sparse ? "(sparse)" : ""
      );
    });

    console.log("\n✅ Index fix complete! You can now register companies.");
  } catch (error) {
    console.error("❌ Error fixing index:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nConnection closed");
  }
}

fixUserIndex();
