const mongoose = require("mongoose");

const payrollEntrySchema = new mongoose.Schema({
  name: String,
  amount: Number,
});

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: { type: String, required: true }, // e.g., "June" or "06"
    year: { type: Number, required: true }, // e.g., 2024

    // Attendance Data
    totalDays: { type: Number, default: 30 },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 }, // Paid leaves
    lopDays: { type: Number, default: 0 }, // Loss of Pay

    // Financials
    basicPay: { type: Number, required: true },
    hra: { type: Number, default: 0 },
    allowances: [payrollEntrySchema],
    deductions: [payrollEntrySchema], // PF, Tax, etc.

    grossSalary: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },

    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Approved", "Paid"],
      default: "Draft",
    },
    paymentDate: Date,
    transactionId: String,

    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate payroll for same employee in same month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payroll", payrollSchema);
