const Payroll = require("../models/Payroll");
const SalaryStructure = require("../models/SalaryStructure");
const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
// const TimeEntry = require("../models/TimeEntry"); // Future integration

exports.calculatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    console.log("[DEBUG] calculatePayroll Request:", {
      employeeId,
      month,
      year,
      tenantId,
    });

    // 1. Fetch Salary Structure
    const structure = await SalaryStructure.findOne({
      employee: employeeId,
      tenantId,
    });
    if (!structure) {
      return res
        .status(400)
        .json({ message: "Salary structure not defined for this employee" });
    }

    // 2. Fetch Employee
    const employee = await Employee.findById(employeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    // 3. Calculate Days (Mocking Attendance for MVP)
    // In real app, query TimeEntries and approved Leaves
    const totalDays = 30; // Standard month
    let lopDays = 0; // Loss of pay days

    // Check confirmed leaves that are unpaid?
    // For MVP, we'll assume no LOP unless manually specified or logic is added later.
    // Let's assume passed in body or default 0.
    if (req.body.lopDays) {
      lopDays = req.body.lopDays;
    }

    const paidDays = totalDays - lopDays;
    const payRatio = paidDays / totalDays;

    // 4. Calculate Components
    const basicPay = Math.round(structure.baseSalary * payRatio);
    const hra = Math.round(structure.hra * payRatio);

    const allowances = structure.allowances.map((a) => ({
      name: a.name,
      amount: Math.round(a.amount * payRatio), // Pro-rate allowances? usually yes
    }));

    // Deductions (Fixed vs Percentage) - For MVP assuming fixed amount in structure
    // Tax/PF might be calculated on earned basic.
    const deductions = structure.deductions.map((d) => ({
      name: d.name,
      amount: d.amount, // Fixed deductions might not be pro-rated, or depends on policy. Keeping simple.
    }));

    const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
    const grossSalary = basicPay + hra + totalAllowances;

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netSalary = grossSalary - totalDeductions;

    // 5. Create/Update Payroll Record (Draft)
    console.log("[DEBUG] Searching for existing payroll with:", {
      employee: employeeId,
      month,
      year,
    });
    let payroll = await Payroll.findOne({ employee: employeeId, month, year });
    console.log(
      "[DEBUG] Payroll found?",
      !!payroll,
      payroll ? payroll._id : "null"
    );

    if (payroll) {
      if (payroll.status === "Paid") {
        return res
          .status(400)
          .json({ message: "Payroll already paid for this month" });
      }
      // Update existing draft
      payroll.totalDays = totalDays;
      payroll.lopDays = lopDays;
      payroll.presentDays = paidDays; // Simplified
      payroll.basicPay = basicPay;
      payroll.hra = hra;
      payroll.allowances = allowances;
      payroll.deductions = deductions;
      payroll.grossSalary = grossSalary;
      payroll.totalDeductions = totalDeductions;
      payroll.netSalary = netSalary;
      payroll.status = "Draft"; // Reset to draft on recalc
    } else {
      payroll = new Payroll({
        employee: employeeId,
        tenantId,
        month,
        year,
        totalDays,
        lopDays,
        presentDays: paidDays,
        basicPay,
        hra,
        allowances,
        deductions,
        grossSalary,
        totalDeductions,
        netSalary,
        status: "Draft",
        generatedBy: req.user.userId,
      });
    }

    await payroll.save();
    res.json({ message: "Payroll calculated successfully", payroll });
  } catch (error) {
    console.error("Calculate payroll error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPayrollList = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};
    if (month) query.month = month;
    if (year) query.year = year;

    const payrolls = await Payroll.find(query)
      .populate("employee", "firstName lastName employeeId")
      .sort({ createdAt: -1 });

    res.json({ payrolls });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const { createNotification } = require("./notification.controller");

// ... existing code ...

exports.updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Approved, Paid

    const payroll = await Payroll.findById(id).populate({
      path: "employee",
      populate: { path: "user" },
    });

    if (!payroll)
      return res.status(404).json({ message: "Payroll record not found" });

    payroll.status = status;
    if (status === "Paid") {
      payroll.paymentDate = new Date();
    }
    if (status === "Approved") {
      payroll.approvedBy = req.user.userId;
    }

    await payroll.save();

    // Notify Employee on Paid
    if (status === "Paid" && payroll.employee && payroll.employee.user) {
      await createNotification({
        recipient: payroll.employee.user._id,
        type: "PAYROLL",
        title: "Payslip Generated",
        message: `Your payslip for ${payroll.month} ${payroll.year} has been generated and marked as Paid.`,
        relatedId: payroll._id,
        tenantId: req.user.tenantId, // Add tenantId
      });
    }

    res.json({ message: `Payroll marked as ${status}`, payroll });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMyPayslips = async (req, res) => {
  try {
    const { userId } = req.user;
    const employee = await Employee.findOne({ user: userId });
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const payslips = await Payroll.find({
      employee: employee._id,
      status: "Paid", // Only show paid slips
    })
      .populate(
        "employee",
        "firstName lastName employeeId designation department bankDetails"
      )
      .sort({ year: -1, month: -1 });

    res.json({ payslips });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
