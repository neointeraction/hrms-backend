const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payroll.controller");
const salaryController = require("../controllers/salaryStructure.controller");
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// --- Salary Structure Routes ---
// Upsert Salary Structure (HR/Admin)
router.post(
  "/structure",
  authorizePermission("payroll:manage_structure"),
  salaryController.upsertSalaryStructure
);

// Get Salary Structure (HR/Admin/Employee)
// Note: Employees viewing their own structure should be handled via check inside controller or specific 'view_own' logic.
// For now, blocking access to structure unless they have permission.
// If typical employees need this, we might need a separate endpoint /my-structure or logic in controller.
router.get(
  "/structure/:employeeId",
  authorizePermission("payroll:manage_structure"), // Or specific view permission?
  salaryController.getSalaryStructure
);

// Get Payroll Stats (Accountant/Admin)
router.get(
  "/structure/stats/tenant",
  authorizePermission("payroll:view"),
  salaryController.getPayrollStats
);

// --- Payroll Processing Routes ---
// Calculate Payroll (Accountant/Admin) - Returns draft
router.post(
  "/calculate",
  authorizePermission("payroll:process"),
  payrollController.calculatePayroll
);

// Get Payroll List (Accountant/Admin)
router.get(
  "/list",
  authorizePermission("payroll:view"), // Or process?
  payrollController.getPayrollList
);

// Update Payroll Status (Approve/Pay)
router.put("/:id/status", payrollController.updatePayrollStatus);

// --- Employee Routes ---
// Get My Payslips
router.get("/my-payslips", payrollController.getMyPayslips);

module.exports = router;
