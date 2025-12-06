const TimeCorrection = require("../models/TimeCorrection");
const TimeEntry = require("../models/TimeEntry");
const Employee = require("../models/Employee");
const { createAuditLog } = require("../utils/auditLogger");

// Request Time Correction
exports.requestCorrection = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      correctionType,
      requestedDate,
      requestedClockIn,
      requestedClockOut,
      reason,
      timeEntryId,
    } = req.body;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const correction = new TimeCorrection({
      employee: employee._id,
      correctionType,
      requestedDate,
      requestedClockIn,
      requestedClockOut,
      reason,
      timeEntry: timeEntryId || null,
    });

    await correction.save();

    res.status(201).json({
      message: "Correction request submitted",
      correction,
    });
  } catch (error) {
    console.error("Request correction error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Pending Corrections (for managers)
exports.getPendingCorrections = async (req, res) => {
  try {
    // Get all pending corrections
    // In a real app, you'd filter by reporting manager
    const corrections = await TimeCorrection.find({ status: "pending" })
      .populate("employee", "firstName lastName employeeId")
      .populate("timeEntry")
      .sort({ createdAt: -1 });

    res.json({ corrections });
  } catch (error) {
    console.error("Get pending corrections error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Employee's Corrections
exports.getMyCorrections = async (req, res) => {
  try {
    const { userId } = req.user;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const corrections = await TimeCorrection.find({ employee: employee._id })
      .populate("timeEntry")
      .populate("reviewedBy", "email")
      .sort({ createdAt: -1 });

    res.json({ corrections });
  } catch (error) {
    console.error("Get my corrections error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve Correction
exports.approveCorrection = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { comments } = req.body;

    const correction = await TimeCorrection.findById(id);
    if (!correction) {
      return res.status(404).json({ message: "Correction request not found" });
    }

    if (correction.status !== "pending") {
      return res.status(400).json({
        message: "Correction already processed",
      });
    }

    // Apply the correction
    if (correction.correctionType === "add") {
      // Create new time entry
      const employee = await Employee.findById(correction.employee);
      const newEntry = new TimeEntry({
        employee: correction.employee,
        clockIn: correction.requestedClockIn,
        clockOut: correction.requestedClockOut,
        status: "completed",
        notes: `Manual entry - ${correction.reason}`,
      });
      await newEntry.save();
    } else if (correction.correctionType === "edit" && correction.timeEntry) {
      const timeEntry = await TimeEntry.findById(correction.timeEntry);
      if (timeEntry) {
        if (correction.requestedClockIn)
          timeEntry.clockIn = correction.requestedClockIn;
        if (correction.requestedClockOut)
          timeEntry.clockOut = correction.requestedClockOut;
        await timeEntry.save();
      }
    } else if (correction.correctionType === "delete" && correction.timeEntry) {
      await TimeEntry.findByIdAndDelete(correction.timeEntry);
    }

    // Update correction status
    correction.status = "approved";
    correction.reviewedBy = userId;
    correction.reviewedAt = new Date();
    correction.managerComments = comments;
    await correction.save();

    // Audit log
    await createAuditLog({
      entityType: "TimeCorrection",
      entityId: correction._id,
      action: "approve",
      performedBy: userId,
      employee: correction.employee,
      metadata: {
        correctionType: correction.correctionType,
        comments,
      },
    });

    res.json({
      message: "Correction approved",
      correction,
    });
  } catch (error) {
    console.error("Approve correction error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject Correction
exports.rejectCorrection = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { comments } = req.body;

    const correction = await TimeCorrection.findById(id);
    if (!correction) {
      return res.status(404).json({ message: "Correction request not found" });
    }

    if (correction.status !== "pending") {
      return res.status(400).json({
        message: "Correction already processed",
      });
    }

    correction.status = "rejected";
    correction.reviewedBy = userId;
    correction.reviewedAt = new Date();
    correction.managerComments = comments;
    await correction.save();

    // Audit log
    await createAuditLog({
      entityType: "TimeCorrection",
      entityId: correction._id,
      action: "reject",
      performedBy: userId,
      employee: correction.employee,
      metadata: {
        correctionType: correction.correctionType,
        comments,
      },
    });

    res.json({
      message: "Correction rejected",
      correction,
    });
  } catch (error) {
    console.error("Reject correction error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
