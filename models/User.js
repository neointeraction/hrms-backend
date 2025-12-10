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
    sparse: true, // Allows multiple null values, but enforces uniqueness for non-null
  },
  department: {
    type: String,
  },
  designation: {
    type: String,
  },
  doj: {
    type: Date,
  },
  pan: {
    type: String,
  },
  bankName: {
    type: String,
  },
  bankAccountNo: {
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

  // SaaS Multi-Tenancy Fields
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    // Required for non-Super Admin users
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  isCompanyAdmin: {
    type: Boolean,
    default: false,
  },

  loginHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      ip: String,
      device: String,
      location: {
        lat: Number,
        lng: Number,
        address: String,
      },
    },
  ],
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
