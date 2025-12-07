const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // Link to User for auth
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Basic Information
    employeeId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    nickName: { type: String },
    email: { type: String, required: true, unique: true },
    profilePicture: { type: String },

    // Work Information
    department: { type: String },
    location: { type: String },
    designation: { type: String },
    role: { type: String }, // Can be redundant with User role, but good for display
    employmentType: {
      type: String,
      enum: ["Permanent", "Contract", "Intern", "Freelancer", "Part-Time"],
    },
    employeeStatus: {
      type: String,
      enum: [
        "Active",
        "Probation",
        "On Leave",
        "Notice Period",
        "Terminated",
        "Resigned",
      ],
      default: "Active",
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

    // System Metadata
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "addedTime", updatedAt: "modifiedTime" },
  }
);

module.exports = mongoose.model("Employee", employeeSchema);
