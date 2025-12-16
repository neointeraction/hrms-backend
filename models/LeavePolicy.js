const mongoose = require("mongoose");

const LeavePolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "Annual",
        "Sick",
        "Casual",
        "Maternity",
        "Paternity",
        "Unpaid",
        "Custom",
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ["Paid", "Unpaid", "Restricted", "Comp-Off"],
      default: "Paid",
    },
    description: { type: String },

    shortCode: { type: String },
    visibleToEmployees: { type: Boolean, default: true },

    // Allocation Rules
    allocation: {
      cycle: {
        type: String,
        enum: ["Yearly", "Monthly", "Quarterly", "Custom"],
        default: "Yearly",
      },
      count: { type: Number, required: true },
      proRata: { type: Boolean, default: false },
      carryForward: { type: Boolean, default: false },
      maxCarryForward: { type: Number, default: 0 },
      encashment: { type: Boolean, default: false },
      maxEncashment: { type: Number, default: 0 },
    },

    // Eligibility Rules
    eligibility: {
      applyTo: [{ type: String }], // Departments, Designations, etc. (Can be generalized strings for now)
      locations: [{ type: String }],
      employeeTypes: [{ type: String }], // Full-time, Intern, Contract
      gender: {
        type: String,
        enum: ["All", "Male", "Female", "Other"],
        default: "All",
      },
      minTenure: { type: Number, default: 0 }, // In months
    },

    // Leave Application Rules
    rules: {
      minNotice: { type: Number, default: 0 }, // Days
      maxConsecutive: { type: Number, default: 365 },
      allowHalfDay: { type: Boolean, default: true },
      allowOverlapHoliday: { type: Boolean, default: true },
      allowNegative: { type: Boolean, default: false },
      requiresApproval: { type: Boolean, default: true },
    },

    // Documentation
    docs: {
      requiredAfter: { type: Number, default: 0 }, // Days
      mandatory: { type: Boolean, default: false },
      allowedTypes: [{ type: String }], // pdf, jpg, etc.
      documentUrl: { type: String }, // Policy Document URL
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeavePolicy", LeavePolicySchema);
