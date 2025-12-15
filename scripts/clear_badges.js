const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("DB Connection Failed", err);
    process.exit(1);
  }
};

const clearData = async () => {
  await connectDB();
  try {
    const Appreciation = require("../models/Appreciation");
    const result = await Appreciation.deleteMany({});
    console.log(`Deleted ${result.deletedCount} appreciation records.`);
  } catch (error) {
    console.error("Error clearing data:", error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

clearData();
