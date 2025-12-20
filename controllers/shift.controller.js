const Shift = require("../models/Shift");
const Employee = require("../models/Employee");

// Get all shifts for the tenant
exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({ tenantId: req.user.tenantId }).sort({
      createdAt: -1,
    });
    res.json(shifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new shift
exports.createShift = async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      breakDuration,
      gracePeriod,
      workingDays,
    } = req.body;

    const existingShift = await Shift.findOne({
      tenantId: req.user.tenantId,
      name,
    });

    if (existingShift) {
      return res.status(400).json({ message: "Shift name already exists" });
    }

    const newShift = new Shift({
      name,
      startTime,
      endTime,
      breakDuration,
      gracePeriod,
      workingDays,
      tenantId: req.user.tenantId,
      createdBy: req.user.userId,
    });

    await newShift.save();

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Shift",
      entityId: newShift._id,
      action: "create",
      performedBy: req.user.userId,
      metadata: { name: newShift.name },
      tenantId: req.user.tenantId,
    });

    res.status(201).json(newShift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a shift
exports.updateShift = async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      breakDuration,
      gracePeriod,
      workingDays,
      status,
    } = req.body;

    // Check if name is taken by another shift
    if (name) {
      const existingShift = await Shift.findOne({
        tenantId: req.user.tenantId,
        name,
        _id: { $ne: req.params.id },
      });
      if (existingShift) {
        return res.status(400).json({ message: "Shift name already exists" });
      }
    }

    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      {
        name,
        startTime,
        endTime,
        breakDuration,
        gracePeriod,
        workingDays,
        status,
      },
      { new: true }
    );

    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Shift",
      entityId: shift._id,
      action: "update",
      performedBy: req.user.userId,
      changes: req.body, // Simplified
      metadata: { name: shift.name },
      tenantId: req.user.tenantId,
    });

    res.json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a shift
exports.deleteShift = async (req, res) => {
  try {
    // Check if shift is assigned to any employees
    const assignedEmployees = await Employee.countDocuments({
      shiftId: req.params.id,
      teacherId: req.user.tenantId,
    });

    if (assignedEmployees > 0) {
      return res.status(400).json({
        message: `Cannot delete shift. It is assigned to ${assignedEmployees} employees.`,
      });
    }

    const shift = await Shift.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Shift",
      entityId: shift._id,
      action: "delete",
      performedBy: req.user.userId,
      metadata: { name: shift.name },
      tenantId: req.user.tenantId,
    });

    res.json({ message: "Shift deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
