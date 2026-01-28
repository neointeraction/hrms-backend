const Shift = require("../models/Shift");
const Employee = require("../models/Employee");

const mongoose = require("mongoose");

// Get all shifts for the tenant
exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "shiftId",
          as: "employees",
        },
      },
      {
        $project: {
          name: 1,
          startTime: 1,
          endTime: 1,
          breakDuration: 1,
          gracePeriod: 1,
          workingDays: 1,
          saturdayPolicy: 1,
          status: 1,
          tenantId: 1,
          createdAt: 1,
          updatedAt: 1,
          employees: {
            $map: {
              input: "$employees",
              as: "emp",
              in: {
                _id: "$$emp._id",
                firstName: "$$emp.firstName",
                lastName: "$$emp.lastName",
                profilePicture: "$$emp.profilePicture",
                designation: "$$emp.designation",
              },
            },
          },
          employeeCount: { $size: "$employees" },
        },
      },
    ]);

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
      { new: true },
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

// Assign employees to shift
exports.assignEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body;
    const shiftId = req.params.id;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "Invalid employeeIds" });
    }

    await Employee.updateMany(
      { _id: { $in: employeeIds }, tenantId: req.user.tenantId },
      { $set: { shiftId: shiftId } },
    );

    res.json({ message: "Employees assigned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove employees from shift
exports.removeEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body;
    const shiftId = req.params.id;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "Invalid employeeIds" });
    }

    await Employee.updateMany(
      {
        _id: { $in: employeeIds },
        tenantId: req.user.tenantId,
        shiftId: shiftId,
      },
      { $unset: { shiftId: "" } },
    );

    res.json({ message: "Employees removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
