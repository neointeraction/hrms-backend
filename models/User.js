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
    // unique: true, // REMOVED global uniqueness
    sparse: true, // Allows multiple null values
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
  theme: {
    type: String,
    enum: ["light", "dark"],
    default: "light",
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

  resetPasswordToken: String,
  resetPasswordExpires: Date,

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

// Compound indexes to allow same employeeId in different tenants
userSchema.index(
  { employeeId: 1, tenantId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
