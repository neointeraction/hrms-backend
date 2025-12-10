const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
    const user = await User.findOne({ email }).populate({
      path: "roles",
      populate: {
        path: "permissions",
      },
    });

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
      const Tenant = require("../models/Tenant");
      const tenant = await Tenant.findById(user.tenantId);

      if (tenant && tenant.status === "suspended") {
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
      tenantId: user.tenantId, // null for Super Admin
      isSuperAdmin: user.isSuperAdmin || false,
      isCompanyAdmin: user.isCompanyAdmin || false,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
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
    // We import logAudit from utils/auditLogger (assuming it exists or directly using model)
    // To keep it simple and avoid circular dependencies if utils uses models, we can use AuditLog model directly or require at top
    const AuditLog = require("../models/AuditLog");
    await AuditLog.create({
      entityType: "User",
      entityId: user._id,
      action: "login",
      performedBy: user._id,
      // Try to link to employee if possible (user.employeeId is a string, not ObjectId, need to find Employee)
      // For now, simpler to just log user. We can populate employee if we fetch it.
      // We can fetch employee briefly
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
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Me
exports.getMe = async (req, res) => {
  try {
    // req.user is set by auth middleware (to be implemented)
    // We will fetch fresh data just in case, or return what's in token + profile
    const user = await User.findById(req.user.userId)
      .select("-passwordHash")
      .populate("roles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // We can also return the permissions from the token or re-calculate them
    // For consistency with the requirement "Returns the authenticated user's profile and current permissions"
    // We can re-calculate or just pass back what we have.
    // Let's re-calculate to ensure it's up to date with DB changes if any (though token is stateless)
    // Actually, the requirement says "current permissions", usually meaning what the user *currently* has access to.

    // Let's populate deep to get permissions again
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

    // Fetch associated Employee record to get profile picture
    const Employee = require("../models/Employee");
    const employee = await Employee.findOne({ user: user._id });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        designation: employee ? employee.designation : null,
        roles: user.roles.map((r) => r.name),
        avatar:
          employee && employee.profilePicture
            ? `${process.env.BASE_URL || "http://localhost:5001"}/${
                employee.profilePicture
              }`
            : null,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin || false,
        isCompanyAdmin: user.isCompanyAdmin || false,
      },
      permissions: Array.from(permissions),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
