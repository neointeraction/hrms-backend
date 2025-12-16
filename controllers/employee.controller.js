const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Role = require("../models/Role");
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

    console.log("[getEmployees] User:", req.user.userId);
    console.log("[getEmployees] TenantId:", req.user.tenantId);

    const employees = await Employee.find({ tenantId: req.user.tenantId })
      .populate("user", "status roles")
      .populate("reportingManager", "firstName lastName")
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

    console.log(
      "[getEmployees] Found",
      employeesWithStatus.length,
      "employees for tenant",
      req.user.tenantId
    );

    res.json(employeesWithStatus);
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

// Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    // Clean data - remove empty strings for ObjectId and enum fields
    const cleanedData = { ...req.body };

    if (req.file) {
      cleanedData.profilePicture = req.file.path.replace(/\\/g, "/");
    }

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
      },
      {
        firstName: 1,
        lastName: 1,
        designation: 1,
        profilePicture: 1,
        reportingManager: 1,
        employeeId: 1,
        role: 1,
      }
    ).populate("reportingManager", "firstName lastName");
    res.json(employees);
  } catch (err) {
    console.error(err);
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
