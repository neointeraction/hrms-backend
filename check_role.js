const mongoose = require("mongoose");
const User = require("./models/User");
const dotenv = require("dotenv");
dotenv.config();

const checkRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = "sam@neointeraction.com";
    const user = await User.findOne({ email });
    if (user) {
      console.log(
        `User: ${user.email} | Role: '${user.role}' | ID: ${user._id}`
      );
    } else {
      console.log("User not found");
    }
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.connection.close();
  }
};

checkRole();
