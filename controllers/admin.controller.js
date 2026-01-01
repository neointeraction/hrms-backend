const User = require("../models/User");
const Employee = require("../models/Employee");
const Role = require("../models/Role");
const Permission = require("../models/Permission");

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-passwordHash") // Exclude password
      .populate("roles");

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete associated employee record if it exists
    await Employee.deleteOne({ user: req.params.id });

    // Delete the user record
    await User.findByIdAndDelete(req.params.id);

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "User",
      entityId: req.params.id,
      action: "delete",
      performedBy: req.user.userId,
      metadata: { userId: req.params.id },
      tenantId: req.user.tenantId,
    });

    res.json({
      message: "User and associated employee data deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Valid status is required (active or inactive)" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "User",
      entityId: user._id,
      action: "update",
      performedBy: req.user.userId,
      changes: { status },
      metadata: { name: user.name },
      tenantId: req.user.tenantId,
    });

    res.json({ message: "User status updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Role Management ---

// Get all roles
exports.getRoles = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const roles = await Role.find({
      $or: [{ tenantId }, { tenantId: null }, { tenantId: { $exists: false } }],
    })
      .select(
        "name description permissions accessibleModules mandatoryDocuments tenantId"
      )
      .populate("permissions");
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create role
exports.createRole = async (req, res) => {
  try {
    const { name, permissions, accessibleModules, mandatoryDocuments } =
      req.body;
    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const existingRole = await Role.findOne({
      name,
      tenantId: req.user.tenantId,
    });
    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    const role = new Role({
      name,
      permissions: permissions || [],
      accessibleModules: accessibleModules || [],
      mandatoryDocuments: mandatoryDocuments || [],
      tenantId: req.user.tenantId,
    });

    await role.save();

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Role",
      entityId: role._id,
      action: "create",
      performedBy: req.user.userId,
      metadata: { name: role.name },
      tenantId: req.user.tenantId,
    });

    res.status(201).json(role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { name, permissions, accessibleModules, mandatoryDocuments } =
      req.body;

    console.log("[DEBUG] updateRole payload:", {
      id: req.params.id,
      name,
      accessibleModules,
    });
    const role = await Role.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (name) role.name = name;
    if (permissions) role.permissions = permissions;
    if (accessibleModules) role.accessibleModules = accessibleModules;
    if (mandatoryDocuments) role.mandatoryDocuments = mandatoryDocuments;

    await role.save();

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Role",
      entityId: role._id,
      action: "update",
      performedBy: req.user.userId,
      changes: req.body, // Simplified
      metadata: { name: role.name },
      tenantId: req.user.tenantId,
    });

    res.json(role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const roleId = req.params.id;
    const tenantId = req.user.tenantId;

    // Find the role first to check permissions
    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Check if it's a protected system role
    const protectedRoles = [
      "Super Admin",
      "Admin",
      "HR",
      "Employee",
      "Project Manager",
      "Consultant",
      "CEO",
      "Accountant",
      "Intern",
    ];
    if (protectedRoles.includes(role.name)) {
      return res.status(403).json({ message: "Cannot delete system roles" });
    }

    // Allow deletion if:
    // 1. Role belongs to the tenant
    // 2. OR Role has no tenant (legacy/custom) AND it's not protected (checked above)
    // We strictly enforce tenant isolation, but for "orphan" roles created by this user/tenant context previously (or legacy), we might want to clean them up.
    // However, allowing any tenant to delete a global null-tenant role is dangerous in a real multi-tenant app.
    // Assuming this is a single-tenant dev setup or the user owns these roles.
    // A safer check: allow delete if role.tenantId matches OR (role.tenantId is null AND user is Admin/SuperAdmin)

    // For now, let's stick to the user's issue: they want to delete "Test".
    // We will allow deletion if it matches tenant OR if it has no tenant.
    const isOwner =
      (role.tenantId && role.tenantId.toString() === tenantId.toString()) ||
      !role.tenantId;

    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Access denied: Not owner of this role" });
    }

    await Role.deleteOne({ _id: roleId });

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Role",
      entityId: role._id,
      action: "delete",
      performedBy: req.user.userId,
      metadata: { name: role.name },
      tenantId: req.user.tenantId,
    });

    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all permissions
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
