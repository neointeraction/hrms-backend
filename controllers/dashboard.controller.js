const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
const Project = require("../models/Project");
// const TimeEntry = require("../models/TimeEntry"); // Future
const Client = require("../models/Client");
const Payroll = require("../models/Payroll");
const mongoose = require("mongoose");

exports.getCEOStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // 1. Total Employees (Active)
    const totalEmployees = await Employee.countDocuments({
      tenantId,
      employeeStatus: "Active",
    });

    // 2. Total Leaves (Pending + Approved Today?)
    // User asked "Total employees leaves".
    // Let's give: "On Leave Today" and "Pending Requests".
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const onLeaveToday = await Leave.countDocuments({
      tenantId,
      status: "Approved",
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    const pendingLeaves = await Leave.countDocuments({
      tenantId,
      status: "Pending",
    });

    // 3. Total Projects (Active)
    const activeProjects = await Project.countDocuments({
      tenantId,
      status: "Active", // Matches Project Schema
    });

    // 4. Total Hours (Mock for now or Aggregate TimeSheets if model exists)
    // const totalHours = ...
    const totalHours = 0; // Placeholder until TimeSheet model is robust

    // 5. Total Clients
    const totalClients = await Client.countDocuments({ tenantId });

    // 6. Payment Outflow (Total Net Salary Paid - All Time? Or This Month?)
    // Let's do This Month's Outflow
    const currentMonth = new Date().toLocaleString("en-US", {
      month: "long",
    });
    const currentYear = new Date().getFullYear();

    const payrolls = await Payroll.find({
      tenantId,
      month: currentMonth,
      year: currentYear,
      status: "Paid",
    }).populate("employee", "firstName lastName");

    const paymentOutflow = payrolls.reduce(
      (sum, p) => sum + (p.netSalary || 0),
      0
    );

    // 7. Project Distribution Chart

    const projectDistribution = await Project.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } }, // Explicit cast
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { name: "$_id", value: "$count", _id: 0 } },
    ]);

    res.json({
      totalEmployees,
      onLeaveToday,
      pendingLeaves,
      activeProjects,
      totalHours,
      totalClients,
      paymentOutflow,
      payrollBreakdown: payrolls.map((p) => ({
        name: p.employee
          ? `${p.employee.firstName} ${p.employee.lastName}`
          : "Unknown",
        amount: p.netSalary || 0,
      })),
      projectDistribution,
    });
  } catch (error) {
    console.error("CEO Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
