const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    unique: true,
  },
  department: {
    type: String,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
