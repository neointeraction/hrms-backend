const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/email.service");

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, employeeId, department, role, status } =
      req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Assign role
    // If role is provided in body, try to find it. Otherwise default to 'employee'
    const roleName = role || "employee";
    const userRole = await Role.findOne({ name: roleName });

    if (!userRole && role) {
      return res.status(400).json({ message: `Role '${role}' not found` });
    }

    // If default 'employee' role is missing, we might want to handle it, but for now allow empty roles if system is not seeded
    const roles = userRole ? [userRole._id] : [];

    user = new User({
      name,
      email,
      passwordHash,
      employeeId,
      department,
      status: status || "active",
      roles,
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email })
      .populate({
        path: "roles",
        populate: {
          path: "permissions",
        },
      })
      .populate("tenantId", "companyName status limits settings"); // Populate tenant details with limits and settings

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact your administrator.",
      });
    }

    // Check if tenant is active (skip for Super Admin)
    if (user.tenantId && !user.isSuperAdmin) {
      if (user.tenantId.status === "suspended") {
        return res.status(403).json({
          message:
            "Your company account has been suspended. Please contact support.",
        });
      }
    }

    // Flatten permissions
    const permissions = new Set();
    user.roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        permissions.add(permission.name);
      });
    });
    const permissionsArray = Array.from(permissions);

    // Generate JWT
    const payload = {
      userId: user._id,
      permissions: permissionsArray,
      roles: user.roles.map((role) => role.name),
      tenantId: user.tenantId ? user.tenantId._id : null, // Store ID only in token
      isSuperAdmin: user.isSuperAdmin || false,
      isCompanyAdmin: user.isCompanyAdmin || false,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Track Login History
    const { location } = req.body; // Expect { lat, lng } from client
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const device = req.headers["user-agent"];

    user.loginHistory.push({
      ip,
      device,
      location: location
        ? {
            lat: location.lat,
            lng: location.lng,
          }
        : undefined, // Only save if provided
    });

    // Keep only last 50 logins
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(-50);
    }

    await user.save();

    // Log Audit Entry
    const AuditLog = require("../models/AuditLog");
    await AuditLog.create({
      entityType: "User",
      entityId: user._id,
      action: "login",
      performedBy: user._id,
      employee: (
        await require("../models/Employee").findOne({ user: user._id })
      )?._id,
      metadata: {
        ip,
        device,
        location: location
          ? { lat: location.lat, lng: location.lng }
          : undefined,
      },
      ipAddress: ip,
      tenantId: user.tenantId, // Add tenantId
    });

    // Construct response user object with populated tenant name
    const responseUser = {
      _id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      avatar: user.avatar,
      employeeId: user.employeeId,
      department: user.department,
      doj: user.doj,
      pan: user.pan,
      bankName: user.bankName,
      bankAccountNo: user.bankAccountNo,
      tenantId: user.tenantId
        ? {
            _id: user.tenantId._id,
            companyName: user.tenantId.companyName,
            status: user.tenantId.status,
            limits: user.tenantId.limits,
            settings: user.tenantId.settings, // Include settings
          }
        : null,
      isSuperAdmin: user.isSuperAdmin,
      isCompanyAdmin: user.isCompanyAdmin,
      accessibleModules: (user.roles?.[0]?.accessibleModules || []).filter(
        (m) =>
          !user.tenantId ||
          !user.tenantId.limits ||
          !user.tenantId.limits.enabledModules ||
          user.tenantId.limits.enabledModules.includes(m)
      ),
      theme: user.theme,
    };

    res.json({ token, user: responseUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-passwordHash")
      .populate("roles")
      .populate("tenantId", "companyName status limits settings"); // Populate tenant details with limits and settings

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.populate({
      path: "roles",
      populate: { path: "permissions" },
    });

    const permissions = new Set();
    user.roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        permissions.add(permission.name);
      });
    });

    const Employee = require("../models/Employee");
    const employee = await Employee.findOne({ user: user._id }).populate(
      "shiftId",
      "name startTime endTime workingDays breakDuration gracePeriod"
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        designation: employee ? employee.designation : null,
        employeeDbId: employee?._id,
        roles: user.roles, // Return full objects
        accessibleModules: (user.roles?.[0]?.accessibleModules || []).filter(
          (m) =>
            !user.tenantId ||
            !user.tenantId.limits ||
            !user.tenantId.limits.enabledModules ||
            user.tenantId.limits.enabledModules.includes(m)
        ), // Flatten for ease
        avatar:
          employee && employee.profilePicture
            ? employee.profilePicture.startsWith("http")
              ? employee.profilePicture
              : `${process.env.BASE_URL || "http://localhost:5001"}/${
                  employee.profilePicture
                }`
            : null,
        tenantId: user.tenantId
          ? {
              _id: user.tenantId._id,
              companyName: user.tenantId.companyName,
              status: user.tenantId.status,
              limits: user.tenantId.limits,
              settings: user.tenantId.settings, // Include settings
            }
          : null,
        shiftId: employee?.shiftId || null, // Include shift information
        isSuperAdmin: user.isSuperAdmin || false,
        isCompanyAdmin: user.isCompanyAdmin || false,
        theme: user.theme,
      },
      permissions: Array.from(permissions),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Profile (Password, etc.)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, theme } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }
    }

    // Update password if provided
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    if (theme) {
      user.theme = theme;
    }

    await user.save();

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Set token and expiry (1 hour)
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset URL
    // Depending on env, frontend URL might be diff. Assuming localhost:5173 for dev or from env
    const frontendUrl =
      process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `
      <h1>You have requested a password reset</h1>
      <p>Please go to this link to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    `;

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: message,
      });

      res.status(200).json({ success: true, data: "Email Sent" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid Token" });
    }

    const { password } = req.body;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(201).json({
      success: true,
      data: "Password Reset Success",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
