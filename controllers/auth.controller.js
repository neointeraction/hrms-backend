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
      return res
        .status(403)
        .json({
          message:
            "Your account has been deactivated. Please contact your administrator.",
        });
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
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
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

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        roles: user.roles.map((r) => r.name),
      },
      permissions: Array.from(permissions),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
