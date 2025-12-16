const mongoose = require("mongoose");

const EmployeeDocumentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    documentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    versions: [
      {
        versionNumber: { type: Number, required: true },
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true }, // Original filename
        fileSize: { type: Number },
        mimeType: { type: String },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: { type: Date, default: Date.now },
        expiryDate: { type: Date },
        notes: { type: String },
      },
    ],
    currentVersion: {
      type: Number,
      default: 1,
    },
    // Status can be based on latest version: "Valid", "Expiring", "Expired"
    status: {
      type: String,
      enum: ["Valid", "Expiring", "Expired", "Missing"], // "Missing" is virtual mostly
      default: "Valid",
    },
  },
  { timestamps: true }
);

// Ensure one document entry per type per employee
EmployeeDocumentSchema.index(
  { tenantId: 1, employeeId: 1, documentTypeId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.EmployeeDocument ||
  mongoose.model("EmployeeDocument", EmployeeDocumentSchema);
