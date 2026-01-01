const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // Link to User for auth
    // Link to User for auth (optional during onboarding)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    // Basic Information
    employeeId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    nickName: { type: String },
    email: { type: String, required: true },
    profilePicture: { type: String },

    // Work Information
    department: { type: String },
    location: { type: String },
    designation: { type: String },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },
    role: { type: String }, // Can be redundant with User role, but good for display
    employmentType: {
      type: String,
      enum: ["Permanent", "Contract", "Intern", "Freelancer", "Part-Time"],
    },
    employeeStatus: {
      type: String,
      enum: [
        "Draft",
        "Invited",
        "Onboarding",
        "Review",
        "Active",
        "Probation",
        "On Leave",
        "Notice Period",
        "Terminated",
        "Resigned",
      ],
      default: "Active",
    },

    // Onboarding Process Tracking
    onboarding: {
      status: {
        type: String,
        enum: ["Pending", "In Progress", "Submitted", "Approved", "Rejected"],
        default: "Pending",
      },
      currentStep: { type: Number, default: 0 },
      token: { type: String },
      tokenExpires: { type: Date },
      personalDetails: {
        completed: { type: Boolean, default: false },
        data: { type: mongoose.Schema.Types.Mixed }, // Temporary store until approval
      },
      documents: [
        {
          name: String,
          url: String,
          status: {
            type: String,
            enum: ["Pending", "Uploaded", "Verified", "Rejected"],
            default: "Pending",
          },
          comments: String,
        },
      ],
      checklist: [
        {
          task: String,
          completed: Boolean,
          completedAt: Date,
        },
      ],
    },

    sourceOfHire: {
      type: String,
      enum: ["Recruitment", "Referral", "Direct", "Campus", "Vendor"],
    },
    dateOfJoining: { type: Date },
    totalExperience: { type: String }, // Text or calculated

    // Hierarchy Information
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    // Personal Details
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    maritalStatus: { type: String },
    aboutMe: { type: String },
    expertise: { type: String },

    // Identity Information
    uan: { type: String },
    pan: { type: String },
    aadhaar: { type: String },

    // Contact Details
    workPhone: { type: String },
    extension: { type: String },
    seatingLocation: { type: String },
    tags: [{ type: String }],

    // Addresses
    presentAddress: { type: String },
    permanentAddress: { type: String },
    personalMobile: { type: String },
    personalEmail: { type: String },

    // Separation Information
    dateOfExit: { type: Date },

    // Additional Details
    workExperience: [
      {
        companyName: String,
        jobTitle: String,
        fromDate: Date,
        toDate: Date,
        description: String,
        relevant: Boolean,
      },
    ],
    education: [
      {
        instituteName: String,
        degree: String,
        specialization: String,
        dateOfCompletion: Date,
      },
    ],
    dependents: [
      {
        name: String,
        relationship: String,
        dob: Date,
      },
    ],
    // Bank Details
    bankDetails: {
      accountName: { type: String },
      accountNumber: { type: String },
      bankName: { type: String },
      ifscCode: { type: String },
    },

    // System Metadata
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "addedTime", updatedAt: "modifiedTime" },
  }
);

// Compound indexes for Multi-Tenancy
employeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// User linkage index: Unique only if user is set (using partialFilterExpression instead of sparse to handle nulls better)
employeeSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $exists: true, $type: "objectId" } },
  }
);

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
