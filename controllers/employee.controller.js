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

    // 1. Check if user/employee already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const existingEmp = await Employee.findOne({ employeeId });
    if (existingEmp) {
      throw new Error("Employee ID already exists");
    }

    // 2. Find Role ID
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
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
      roles: [role._id],
      status: "active",
    });

    await newUser.save({ session });

    // 4. Clean otherData - remove empty strings for ObjectId and enum fields
    const cleanedData = { ...otherData };

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
      employeeId,
      firstName,
      lastName,
      email,
      role: roleName,
      ...cleanedData,
      addedBy: req.user ? req.user.id : null, // Assuming auth middleware populates req.user
    });

    await newEmployee.save({ session });

    await session.commitTransaction();
    res.status(201).json(newEmployee);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    session.endSession();
  }
};

// Get all employees
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate("user", "status roles") // Populate user status
      .populate("reportingManager", "firstName lastName");
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single employee
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
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

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    // Clean data - remove empty strings for ObjectId and enum fields
    const cleanedData = { ...req.body };

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

    // Also update User name if changed
    if (req.body.firstName || req.body.lastName) {
      await User.findByIdAndUpdate(employee.user, {
        name: `${req.body.firstName || employee.firstName} ${
          req.body.lastName || employee.lastName
        }`,
      });
    }

    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
