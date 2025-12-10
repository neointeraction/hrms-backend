const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    // Basic Information
    companyName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subdomain: {
      type: String,
      unique: true,
      sparse: true, // Allow null values
      lowercase: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "trial", "expired"],
      default: "trial",
    },

    // Subscription Details
    plan: {
      type: String,
      enum: ["free", "basic", "pro", "enterprise"],
      default: "free",
    },
    subscriptionStart: {
      type: Date,
      default: Date.now,
    },
    subscriptionEnd: {
      type: Date,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    // Plan Limits
    limits: {
      maxEmployees: {
        type: Number,
        default: 10, // Free tier default
      },
      maxStorage: {
        type: Number, // in MB
        default: 100,
      },
      enabledModules: {
        type: [String],
        default: ["attendance", "leave", "employees"], // Free tier defaults
      },
    },

    // Current Usage
    usage: {
      employeeCount: {
        type: Number,
        default: 0,
      },
      storageUsed: {
        type: Number, // in MB
        default: 0,
      },
    },

    // Billing Information
    billing: {
      stripeCustomerId: String,
      paymentMethod: {
        type: String, // card_xxxx
      },
      lastPaymentDate: Date,
      nextBillingDate: Date,
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
      },
    },

    // Company Settings (customizable by company admin)
    settings: {
      workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "18:00" },
      },
      timezone: { type: String, default: "Asia/Kolkata" },
      currency: { type: String, default: "INR" },
      dateFormat: { type: String, default: "DD/MM/YYYY" },
      weekStartsOn: { type: Number, default: 1 }, // 0 = Sunday, 1 = Monday
    },

    // Meta
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Super Admin who created this tenant
    },
    notes: String, // Internal notes for Super Admin
  },
  {
    timestamps: true,
  }
);

// Indexes
tenantSchema.index({ status: 1 });
tenantSchema.index({ plan: 1 });
tenantSchema.index({ "billing.nextBillingDate": 1 });

module.exports = mongoose.model("Tenant", tenantSchema);
