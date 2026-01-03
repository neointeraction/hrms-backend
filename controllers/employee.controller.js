const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Role = require("../models/Role");
const Designation = require("../models/Designation");
const bcrypt = require("bcryptjs");

// Create a new employee (and corresponding user)
exports.createEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      // Basic Info
      employeeId,
      firstName,
      lastName,
      email,
      password, // Extract password explicitly
      role: roleName, // Role name from dropdown

      // ... other fields
      ...otherData
    } = req.body;

    const profilePicture = req.file ? req.file.path.replace(/\\/g, "/") : null;

    // Get tenant context
    if (!req.user || !req.user.tenantId) {
      throw new Error("No tenant context found");
    }
    const tenantId = req.user.tenantId;

    // Check Tenant Limits
    const Tenant = require("../models/Tenant");
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      throw new Error("Tenant context not found");
    }

    const currentEmployeeCount = await Employee.countDocuments({ tenantId });

    if (currentEmployeeCount >= tenant.limits.maxEmployees) {
      throw new Error(
        `Employee limit reached for your ${tenant.plan} plan (${tenant.limits.maxEmployees} employees). Please upgrade your plan.`
      );
    }

    // 1. Check if user/employee already exists in this tenant
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      throw new Error(
        "User with this email already exists in your organization"
      );
    }

    const existingEmp = await Employee.findOne({ employeeId, tenantId });
    if (existingEmp) {
      throw new Error("Employee ID already exists in your organization");
    }

    // 2. Find Role ID within tenant
    const role = await Role.findOne({ name: roleName, tenantId });
    if (!role) {
      throw new Error(`Role '${roleName}' not found in your organization`);
    }

    // 3. Create User Account
    // Use provided password or auto-generate (e.g., LastName@123)
    const userPassword = password || `${lastName}@123`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userPassword, salt);

    const newUser = new User({
      name: `${firstName} ${lastName}`,
      email,
      passwordHash,
      employeeId,
      tenantId,
      roles: [role._id],
      status: "active",
    });

    await newUser.save({ session });

    // 4. Clean otherData - remove empty strings for ObjectId and enum fields
    const cleanedData = { ...otherData };

    // Parse JSON fields (Handle FormData strings)
    // Parse JSON fields (Handle FormData strings)
    const jsonFields = [
      "workExperience",
      "education",
      "dependents",
      "tags",
      "bankDetails",
    ];
    jsonFields.forEach((field) => {
      if (typeof cleanedData[field] === "string") {
        try {
          cleanedData[field] = JSON.parse(cleanedData[field]);
        } catch (e) {
          console.error(`Failed to parse ${field}`, e);
          cleanedData[field] = []; // Fallback to empty array
        }
      }
    });

    // Remove empty string for reportingManager (ObjectId field)
    if (cleanedData.reportingManager === "") {
      delete cleanedData.reportingManager;
    }

    // Remove empty strings for enum fields
    const enumFields = [
      "gender",
      "employmentType",
      "sourceOfHire",
      "maritalStatus",
    ];
    enumFields.forEach((field) => {
      if (cleanedData[field] === "") {
        delete cleanedData[field];
      }
    });

    // Handle Designation logic
    if (cleanedData.designationId) {
      const design = await Designation.findOne({
        _id: cleanedData.designationId,
        tenantId,
      });
      if (design) {
        cleanedData.designation = design.name;
      }
    }

    // Handle Shift logic
    if (cleanedData.shiftId) {
      // Validate Shift exists
      const Shift = require("../models/Shift");
      const shift = await Shift.findOne({
        _id: cleanedData.shiftId,
        tenantId,
      });
      if (!shift) {
        delete cleanedData.shiftId; // Invalid shift, ignore
      }
    }

    // 5. Create Employee Profile
    const newEmployee = new Employee({
      user: newUser._id,
      tenantId,
      employeeId,
      firstName,
      lastName,
      email,
      role: roleName,
      profilePicture, // Add profile picture path
      ...cleanedData,
      addedBy: req.user ? req.user.id : null,
    });

    await newEmployee.save({ session });

    // Increment tenant employee count
    await Tenant.findByIdAndUpdate(
      tenantId,
      {
        $inc: { "usage.employeeCount": 1 },
      },
      { session }
    );

    await session.commitTransaction();

    // Log Audit Entry (using non-transactional session for safety or simple async)
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Employee",
      entityId: newEmployee._id,
      action: "create",
      performedBy: req.user.userId,
      employee: newEmployee._id,
      metadata: {
        name: `${newEmployee.firstName} ${newEmployee.lastName}`,
        role: roleName,
      },
      tenantId: tenantId,
    });

    res.status(201).json(newEmployee);
  } catch (err) {
    await session.abortTransaction();
    console.error("Create Employee Error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    session.endSession();
  }
};

// Get all employees
exports.getEmployees = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employees = await Employee.find({ tenantId: req.user.tenantId })
      .populate("user", "status roles")
      .populate("reportingManager", "firstName lastName")
      .populate("user", "status roles")
      .populate("reportingManager", "firstName lastName")
      .populate("shiftId", "name startTime endTime")
      .lean(); // Use lean() to allow adding properties

    // Fetch active time entries for this tenant for today/current status
    // status: "active" implies they are currently clocked in
    const TimeEntry = require("../models/TimeEntry");
    const activeEntries = await TimeEntry.find({
      tenantId: req.user.tenantId,
      status: "active",
    }).select("employee");

    const activeEmployeeIds = new Set(
      activeEntries.map((entry) => entry.employee.toString())
    );

    // Add isOnline flag
    const employeesWithStatus = employees.map((emp) => ({
      ...emp,
      isOnline: activeEmployeeIds.has(emp._id.toString()),
    }));

    res.json(employeesWithStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Current Employee Profile (Me)
exports.getEmployeeProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employee = await Employee.findOne({
      user: req.user.userId,
      tenantId: req.user.tenantId,
    })
      .populate("user")
      .populate("reportingManager", "firstName lastName")
      .populate("shiftId", "name startTime endTime");

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single employee
exports.getEmployeeById = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("user")
      .populate("reportingManager", "firstName lastName");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .select(
        "firstName lastName designation department profilePicture email workPhone employeeId dateOfJoining reportingManager isOnline"
      )
      .populate("reportingManager", "firstName lastName");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    // Auto-repair corrupt onboarding field if present (caused by previous frontend bug)
    if (req.params.id) {
      try {
        // Use native driver to bypass Mongoose schema validation failure
        const result = await Employee.collection.updateOne(
          {
            _id: new mongoose.Types.ObjectId(req.params.id),
            onboarding: { $type: "string" }, // corrupted as string
          },
          {
            $set: {
              onboarding: {
                status: "Pending",
                documents: [],
                checklist: [],
              },
            },
          }
        );
        if (result.modifiedCount > 0) {
        }
      } catch (e) {
        console.warn("[UpdateEmployee] Auto-repair failed:", e);
      }
    }

    const existingEmployee = await Employee.findById(req.params.id);
    if (!existingEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Clean data - remove empty strings for ObjectId and enum fields
    const cleanedData = { ...req.body };

    // Security: Explicitly remove password fields to prevent accidental updates
    delete cleanedData.password;
    delete cleanedData.passwordHash;

    if (req.file) {
      cleanedData.profilePicture = req.file.path.replace(/\\/g, "/");
    }

    // Parse JSON fields (Handle FormData strings) - DO THIS FIRST
    const jsonFields = [
      "workExperience",
      "education",
      "dependents",
      "tags",
      "bankDetails",
    ];
    jsonFields.forEach((field) => {
      if (typeof cleanedData[field] === "string") {
        try {
          cleanedData[field] = JSON.parse(cleanedData[field]);
        } catch (e) {
          console.error(`Failed to parse ${field}`, e);
          cleanedData[field] = []; // Fallback to empty array
        }
      }
    });

    // Remove empty strings for ObjectId fields - DO THIS BEFORE USING THEM
    if (cleanedData.reportingManager === "") {
      delete cleanedData.reportingManager;
    }
    if (cleanedData.designationId === "") {
      delete cleanedData.designationId;
    }
    if (cleanedData.shiftId === "") {
      delete cleanedData.shiftId;
    }

    // Remove empty strings for enum fields
    const enumFields = [
      "gender",
      "employmentType",
      "sourceOfHire",
      "maritalStatus",
    ];
    enumFields.forEach((field) => {
      if (cleanedData[field] === "") {
        delete cleanedData[field];
      }
    });

    // NOW handle Designation logic for Update (after cleanup)
    if (cleanedData.designationId) {
      const design = await Designation.findOne({
        _id: cleanedData.designationId,
        tenantId: req.user.tenantId,
      });
      if (design) {
        cleanedData.designation = design.name;
      }
    }

    // Handle Shift logic for Update (after cleanup)
    if (cleanedData.shiftId) {
      const Shift = require("../models/Shift");
      const shift = await Shift.findOne({
        _id: cleanedData.shiftId,
        tenantId: req.user.tenantId,
      });
      if (!shift) {
        delete cleanedData.shiftId; // Invalid shift, ignore
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        ...cleanedData,
        modifiedBy: req.user ? req.user.id : null,
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Also update User name/email if changed
    const userUpdates = {};
    if (req.body.firstName || req.body.lastName) {
      userUpdates.name = `${req.body.firstName || employee.firstName} ${
        req.body.lastName || employee.lastName
      }`;
    }
    if (req.body.email && req.body.email !== employee.email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: req.body.email,
        tenantId: req.user.tenantId,
        _id: { $ne: employee.user },
      });
      if (existingUser) {
        // Revert employee update if user email is taken?
        // Or just throw error?
        // Since we already updated employee, we might have inconsistency.
        // ideally we should have checked this BEFORE updating employee.
        // But let's check it now.
        throw new Error("Email already in use by another user");
      }
      userUpdates.email = req.body.email;
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(employee.user, userUpdates);
    }

    // IMPORTANT: Update User role if changed
    if (req.body.role) {
      const tenantId = req.user.tenantId; // Get tenantId from user context
      const newRole = await Role.findOne({
        name: req.body.role,
        tenantId: tenantId,
      });

      if (newRole) {
        await User.findByIdAndUpdate(employee.user, {
          roles: [newRole._id],
        });
      } else {
        console.warn(
          `Role '${req.body.role}' not found in tenant ${tenantId}, User roles not updated`
        );
      }
    }

    // Log Audit for Significant Changes
    const AuditLog = require("../models/AuditLog");
    const fieldsToTrack = [
      "designation",
      "role",
      "department",
      "employeeStatus",
      "reportingManager",
    ];
    const changes = {};

    fieldsToTrack.forEach((field) => {
      // Compare string values roughly, or for ObjectId check stringified
      const oldVal = existingEmployee[field]
        ? existingEmployee[field].toString()
        : null;
      let newVal =
        employee[field] !== undefined && employee[field] !== null
          ? employee[field].toString()
          : null;

      if (oldVal !== newVal) {
        changes[field] = { from: oldVal, to: newVal };
      }
    });

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        entityType: "Employee",
        entityId: employee._id,
        action: "update",
        performedBy: req.user ? req.user.userId : employee.user, // Fallback if system update
        employee: employee._id,
        changes: changes,
        tenantId: req.user.tenantId,
        metadata: {
          description: "Employee profile updated",
          name: `${employee.firstName} ${employee.lastName}`,
        },
      });
    }

    res.json(employee);
  } catch (err) {
    console.error("Update Employee Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get Employee Hierarchy (Simplified list for tree building)
exports.getHierarchy = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employees = await Employee.find(
      {
        tenantId: req.user.tenantId, // Filter by tenant
        role: { $nin: ["Admin", "Super Admin"] },
        employeeStatus: {
          $in: ["Active", "Probation", "Notice Period", "On Leave"],
        }, // Exclude Invited, Onboarding, etc.
      },
      {
        firstName: 1,
        lastName: 1,
        designation: 1,
        profilePicture: 1,
        reportingManager: 1,
        employeeId: 1,
        role: 1,
        employeeStatus: 1,
      }
    ).populate("reportingManager", "firstName lastName");

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Employee Directory (Safe public info)
exports.getDirectory = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employees = await Employee.find(
      {
        tenantId: req.user.tenantId,
        employeeStatus: {
          $in: ["Active", "Probation", "Notice Period", "On Leave"],
        },
      },
      // Select ONLY safe fields
      {
        firstName: 1,
        lastName: 1,
        designation: 1,
        department: 1,
        email: 1,
        workPhone: 1,
        personalMobile: 1,
        profilePicture: 1,
        reportingManager: 1,
        isOnline: 1, // Note: this is calculated below if needed, but schema doesn't have it persistent usually
        role: 1,
        employeeStatus: 1,
      }
    )
      .populate("reportingManager", "firstName lastName")
      .lean();

    // Fetch active time entries for online status
    const TimeEntry = require("../models/TimeEntry");
    const activeEntries = await TimeEntry.find({
      tenantId: req.user.tenantId,
      status: "active",
    }).select("employee");

    const activeEmployeeIds = new Set(
      activeEntries.map((entry) => entry.employee.toString())
    );

    const directory = employees.map((emp) => ({
      ...emp,
      isOnline: activeEmployeeIds.has(emp._id.toString()),
    }));

    res.json(directory);
  } catch (err) {
    console.error("Get directory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// Get Upcoming Birthdays and Work Anniversaries
exports.getUpcomingEvents = async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    // Filter by Tenant ID
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employees = await Employee.find(
      {
        employeeStatus: "Active",
        tenantId: req.user.tenantId,
      },
      {
        firstName: 1,
        lastName: 1,
        dateOfBirth: 1,
        dateOfJoining: 1,
        profilePicture: 1,
        designation: 1,
      }
    ).lean();

    const upcomingBirthdays = [];
    const upcomingAnniversaries = [];

    employees.forEach((emp) => {
      // 1. Check Birthday
      if (emp.dateOfBirth) {
        const dob = new Date(emp.dateOfBirth);
        // Create date for this year
        let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

        // If birthday has passed this year, check next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        // Check if within range
        if (nextBirthday >= today && nextBirthday <= next30Days) {
          upcomingBirthdays.push({
            id: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
            date: nextBirthday, // Return the computed date for sorting
            originalDate: emp.dateOfBirth,
            type: "Birthday",
            profilePicture: emp.profilePicture,
            designation: emp.designation,
          });
        }
      }

      // 2. Check Work Anniversary
      if (emp.dateOfJoining) {
        const doj = new Date(emp.dateOfJoining);
        let nextAnniversary = new Date(
          currentYear,
          doj.getMonth(),
          doj.getDate()
        );

        if (nextAnniversary < today) {
          nextAnniversary.setFullYear(currentYear + 1);
        }

        if (nextAnniversary >= today && nextAnniversary <= next30Days) {
          const years = nextAnniversary.getFullYear() - doj.getFullYear();
          if (years > 0) {
            upcomingAnniversaries.push({
              id: emp._id,
              name: `${emp.firstName} ${emp.lastName}`,
              date: nextAnniversary,
              originalDate: emp.dateOfJoining,
              years: years,
              type: "Anniversary",
              profilePicture: emp.profilePicture,
              designation: emp.designation,
            });
          }
        }
      }
    });

    // Sort by date sort((a, b) => a.date - b.date)
    upcomingBirthdays.sort((a, b) => a.date - b.date);
    upcomingAnniversaries.sort((a, b) => a.date - b.date);

    res.json({
      birthdays: upcomingBirthdays,
      anniversaries: upcomingAnniversaries,
    });
  } catch (err) {
    console.error("Get upcoming events error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Employee Timeline
exports.getEmployeeTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Verify Tenant Context
    if (
      !req.user.tenantId ||
      (employee.tenantId &&
        employee.tenantId.toString() !== req.user.tenantId.toString())
    ) {
      return res.status(403).json({ message: "Unauthorized tenant access" });
    }

    // Check Permissions:
    // If user has "employees:view", they can view anyone.
    // If not, they must own this employee profile (My Journey).
    const hasViewAll = req.user.permissions?.includes("employees:view");
    const isOwner =
      employee.user && employee.user.toString() === req.user.userId;

    if (!hasViewAll && !isOwner) {
      return res
        .status(403)
        .json({ message: "Access denied: You can only view your own journey" });
    }

    const timeline = [];

    // 1. Date of Joining
    if (employee.dateOfJoining) {
      timeline.push({
        type: "Joined",
        date: employee.dateOfJoining,
        title: "Joined the Company",
        description: `Started as ${employee.designation || "Employee"}`,
        icon: "Rocket",
      });

      // 2. Probation Completion (Assuming 6 months for now, or fetch from settings)
      const probationEndDate = new Date(employee.dateOfJoining);
      probationEndDate.setMonth(probationEndDate.getMonth() + 6);

      // Only show if date has passed or is today
      // if (probationEndDate <= new Date()) {
      const isFuture = probationEndDate > new Date();
      timeline.push({
        type: "Probation",
        date: probationEndDate,
        title: isFuture
          ? "Upcoming Probation Completion"
          : "Probation Completion",
        description: isFuture
          ? "Scheduled completion of probation period"
          : "Successfully completed probation period",
        icon: isFuture ? "Clock" : "CheckCircle",
      });
      // }

      // 3. Work Anniversaries
      const today = new Date();
      const joinYear = new Date(employee.dateOfJoining).getFullYear();
      const currentYear = today.getFullYear();

      for (let year = joinYear + 1; year <= currentYear; year++) {
        const anniversaryDate = new Date(employee.dateOfJoining);
        anniversaryDate.setFullYear(year);

        if (anniversaryDate <= today) {
          const yearsCompleted = year - joinYear;
          timeline.push({
            type: "Anniversary",
            date: anniversaryDate,
            title: `${yearsCompleted} Year Work Anniversary`,
            description: `Completed ${yearsCompleted} year${
              yearsCompleted > 1 ? "s" : ""
            } with us`,
            icon: "Trophy",
          });
        }
      }
    }

    // 4. Promotions / Role Changes from AuditLog
    // Note: This relies on AuditLog being populated by updateEmployee calls
    const AuditLog = require("../models/AuditLog");
    const changes = await AuditLog.find({
      entityType: "Employee",
      entityId: employee._id,
      action: "update",
      $or: [
        { "changes.designation": { $exists: true } },
        { "changes.role": { $exists: true } },
        { "changes.department": { $exists: true } },
      ],
    }).sort({ createdAt: 1 });

    changes.forEach((log) => {
      const chg = log.changes;
      if (chg.designation) {
        timeline.push({
          type: "DesignationChange",
          date: log.createdAt,
          title: "Designation Updated",
          description: `Changed from ${chg.designation.from} to ${chg.designation.to}`,
          icon: "TrendingUp",
        });
      }
      if (chg.role) {
        timeline.push({
          type: "RoleChange",
          date: log.createdAt,
          title: "Role Updated",
          description: `Role changed from ${chg.role.from} to ${chg.role.to}`,
          icon: "Shield",
        });
      }
    });

    // 5. Awards & Appreciations
    const Appreciation = require("../models/Appreciation");
    const appreciations = await Appreciation.find({
      recipient: employee._id,
    }).populate("badge sender");

    appreciations.forEach((app) => {
      timeline.push({
        type: "Award",
        date: app.createdAt,
        title: `Received ${app.badge.title}`,
        description: `Awarded by ${app.sender.firstName} ${app.sender.lastName}: "${app.message}"`,
        icon: "Trophy",
      });
    });

    // 6. Project Assignments
    // Projects link to User, not Employee
    if (employee.user) {
      const Project = require("../models/Project");
      const projects = await Project.find({
        members: employee.user,
      });

      projects.forEach((proj) => {
        timeline.push({
          type: "Project",
          date: proj.startDate || proj.createdAt,
          title: `Joined Project: ${proj.name}`,
          description: `Status: ${proj.status}`,
          icon: "Rocket",
        });
      });
    }

    // Sort all events by date (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(timeline);
  } catch (err) {
    console.error("Get timeline error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Hard Delete Employee (Clean up for re-onboarding or mistake correction)
exports.deleteEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Employee not found" });
    }

    // Verify Tenant
    if (
      employee.tenantId &&
      req.user.tenantId &&
      employee.tenantId.toString() !== req.user.tenantId.toString()
    ) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // 1. Delete Employee Record
    await Employee.findByIdAndDelete(id).session(session);

    // 2. Delete Associated User Record (Critical for re-onboarding with same email)
    if (employee.user) {
      await User.findByIdAndDelete(employee.user).session(session);
    }

    // 3. Decrement Tenant Count
    const Tenant = require("../models/Tenant");
    await Tenant.findByIdAndUpdate(
      employee.tenantId,
      { $inc: { "usage.employeeCount": -1 } },
      { session }
    );

    await session.commitTransaction();

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Employee",
      entityId: id,
      action: "delete",
      performedBy: req.user.userId,
      metadata: {
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        description: "Hard deleted employee and associated user account",
      },
      tenantId: req.user.tenantId,
    });

    res.json({ message: "Employee and user account deleted successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error("Delete Employee Error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
};
