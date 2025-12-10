const mongoose = require("mongoose");

const allowanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  taxable: { type: Boolean, default: true },
});

const deductionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true }, // Fixed amount or Percentage logic handled in controller
  type: { type: String, enum: ["Fixed", "Percentage"], default: "Fixed" },
});

const salaryStructureSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true, // One active structure per employee usually
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    baseSalary: { type: Number, required: true }, // Basic Pay
    hra: { type: Number, default: 0 },
    allowances: [allowanceSchema],
    deductions: [deductionSchema],
    effectiveDate: { type: Date, default: Date.now },
    currency: { type: String, default: "USD" },
    netSalary: { type: Number }, // Computed cached value for reference
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
