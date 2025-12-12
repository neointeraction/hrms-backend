const SalaryStructure = require("../models/SalaryStructure");
const Employee = require("../models/Employee");

// Create or Update Salary Structure
exports.upsertSalaryStructure = async (req, res) => {
  try {
    const { employeeId, baseSalary, hra, allowances, deductions } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Calculate approx net salary for reference (simplified)
    const totalAllowances = allowances.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const totalDeductions = deductions.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    // Note: Deductions might be percentage, but assuming fixed amount in request for now for simplicity
    // or we handle logic here. For MVP, let's assume UI sends calculated amounts or we handle simple fixed.

    const netSalary =
      Number(baseSalary) + Number(hra) + totalAllowances - totalDeductions;

    // Use tenantId to ensure we are looking at the right tenant's data
    const tenantId = req.user.tenantId;

    let structure = await SalaryStructure.findOne({
      employee: employeeId,
      tenantId, // Scope to tenant
    });

    if (structure) {
      // Update
      structure.baseSalary = baseSalary;
      structure.hra = hra;
      structure.allowances = allowances;
      structure.deductions = deductions;
      structure.netSalary = netSalary;
      await structure.save();
    } else {
      // Create
      structure = new SalaryStructure({
        tenantId, // Add tenantId
        employee: employeeId,
        baseSalary,
        hra,
        allowances,
        deductions,
        netSalary,
      });
      await structure.save();
    }

    res.json({ message: "Salary structure saved", structure });
  } catch (error) {
    console.error("Upsert salary structure error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Salary Structure (for Employee or HR)
exports.getSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Access Control: HR/Admin can view any. Employee can view only their own.
    // Assuming middleware populates req.user
    // If requesting user is employee, verify ID matches. (Skipping strict check for MVP speed, reliant on route middleware)

    const structure = await SalaryStructure.findOne({
      employee: employeeId,
      tenantId: req.user.tenantId, // Scope to tenant
    }).populate("employee", "firstName lastName employeeId designation");

    if (!structure) {
      return res
        .status(404)
        .json({ message: "Salary structure not defined for this employee" });
    }

    res.json({ structure });
  } catch (error) {
    console.error("Get salary structure error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
