const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/hrms";

mongoose
  .connect(uri)
  .then(async () => {
    try {
      console.log("Connected. Dropping index...");
      await mongoose.connection.collection("employees").dropIndex("user_1");
      console.log("Dropped user_1 index successfully.");
    } catch (e) {
      console.log("Index drop failed (maybe didn't exist?):", e.message);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
