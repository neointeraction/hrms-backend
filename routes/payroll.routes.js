const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payroll.controller");
const salaryController = require("../controllers/salaryStructure.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// --- Salary Structure Routes ---
// Upsert Salary Structure (HR/Admin)
router.post("/structure", salaryController.upsertSalaryStructure);

// Get Salary Structure (HR/Admin/Employee)
router.get("/structure/:employeeId", salaryController.getSalaryStructure);

// --- Payroll Processing Routes ---
// Calculate Payroll (Accountant/Admin) - Returns draft
router.post("/calculate", payrollController.calculatePayroll);

// Get Payroll List (Accountant/Admin)
router.get("/list", payrollController.getPayrollList);

// Update Payroll Status (Approve/Pay)
router.put("/:id/status", payrollController.updatePayrollStatus);

// --- Employee Routes ---
// Get My Payslips
router.get("/my-payslips", payrollController.getMyPayslips);

module.exports = router;
