const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Role = require("../models/Role");
const Employee = require("../models/Employee"); // Import Employee for cascading delete
const bcrypt = require("bcryptjs");

// Get All Tenants
exports.getAllTenants = async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (plan) query.plan = plan;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { ownerEmail: { $regex: search, $options: "i" } },
      ];
    }

    const tenants = await Tenant.find(query)
      .sort({ createdAt: -1 })
      .select("-billing.stripeCustomerId"); // Hide sensitive data

    // Enrich with user count
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const userCount = await User.countDocuments({ tenantId: tenant._id });
        const employeeCount = await Employee.countDocuments({
          tenantId: tenant._id,
        });
        return {
          ...tenant.toObject(),
          stats: {
            userCount,
            employeeCount, // Dynamic count
            storageUsed: tenant.usage.storageUsed,
          },
        };
      })
    );

    res.json({ tenants: tenantsWithStats });
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Users (Global)
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, tenantId, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (tenantId) query.tenantId = tenantId;

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // If role filter is applied, we need to find role IDs first
    if (role) {
      const roles = await Role.find({ name: role }).select("_id");
      const roleIds = roles.map((r) => r._id);
      query.roles = { $in: roleIds };
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .populate("roles", "name")
      .populate("tenantId", "companyName plan status") // Get tenant details
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Get all global users error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Single Tenant Details
exports.getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Get tenant statistics
    const userCount = await User.countDocuments({ tenantId: tenant._id });
    const employeeCount = await Employee.countDocuments({
      tenantId: tenant._id,
    });
    const adminUser = await User.findOne({
      tenantId: tenant._id,
      isCompanyAdmin: true,
    }).select("name email status");

    res.json({
      tenant,
      stats: {
        userCount,
        employeeCount, // Dynamic count
        storageUsed: tenant.usage.storageUsed,
      },
      admin: adminUser,
    });
  } catch (error) {
    console.error("Get tenant error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create Tenant (Manual)
exports.createTenant = async (req, res) => {
  try {
    const { companyName, ownerEmail, plan, subdomain } = req.body;

    // Validate required fields
    if (!companyName || !ownerEmail) {
      return res.status(400).json({
        message: "Company name and owner email are required",
      });
    }

    // Check if company name already exists
    const existingTenant = await Tenant.findOne({ companyName });
    if (existingTenant) {
      return res.status(400).json({
        message: "Company name already exists",
      });
    }

    // Check if owner email is already in use
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "Owner email already registered",
      });
    }

    // Set plan limits based on plan
    const planLimits = {
      free: {
        maxEmployees: 10,
        maxStorage: 100, // MB
        enabledModules: ["attendance", "leave", "employees"],
      },
      basic: {
        maxEmployees: 50,
        maxStorage: 500,
        enabledModules: [
          "attendance",
          "leave",
          "employees",
          "payroll",
          "projects",
        ],
      },
      pro: {
        maxEmployees: 200,
        maxStorage: 2000,
        enabledModules: [
          "attendance",
          "leave",
          "employees",
          "payroll",
          "projects",
          "tasks",
          "timesheet",
        ],
      },
      enterprise: {
        maxEmployees: 9999,
        maxStorage: 10000,
        enabledModules: [
          "attendance",
          "leave",
          "employees",
          "payroll",
          "projects",
          "tasks",
          "timesheet",
          "policies",
        ],
      },
    };

    const selectedPlan = plan || "free";
    const limits = planLimits[selectedPlan];

    // Create Tenant
    const tenant = new Tenant({
      companyName,
      ownerEmail,
      subdomain: subdomain || undefined, // Avoid empty string for unique index
      plan: selectedPlan,
      status: "active",
      limits,
      createdBy: req.user.userId, // Super Admin who created it
    });
    await tenant.save();

    // Seed default roles for this tenant
    const defaultRoles = [
      { name: "Admin", description: "Administrator with full access" },
      { name: "HR", description: "HR Manager" },
      { name: "Project Manager", description: "Project Manager" },
      { name: "Employee", description: "Standard Employee" },
      { name: "Intern", description: "Intern" },
      { name: "Consultant", description: "Consultant" },
    ];

    const createdRoles = [];
    for (const roleData of defaultRoles) {
      const role = new Role({
        ...roleData,
        tenantId: tenant._id,
        permissions: [],
      });
      await role.save();
      createdRoles.push(role);
    }

    // Create Company Admin user
    const adminRole = createdRoles.find((r) => r.name === "Admin");
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = "Welcome@123"; // TODO: Generate random & send via email
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const adminUser = new User({
      name: "Admin",
      email: ownerEmail,
      passwordHash,
      tenantId: tenant._id,
      isCompanyAdmin: true,
      status: "active",
      roles: adminRole ? [adminRole._id] : [],
    });
    await adminUser.save();

    // Increment employee count
    await Tenant.findByIdAndUpdate(tenant._id, {
      $inc: { "usage.employeeCount": 1 },
    });

    res.status(201).json({
      message: "Tenant created successfully",
      tenant,
      admin: {
        email: ownerEmail,
        tempPassword: defaultPassword,
      },
    });
  } catch (error) {
    console.error("Create tenant error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Tenant
exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields directly
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.usage; // Usage should be updated via specific endpoints

    // If plan is being updated, update limits as well
    if (updates.plan) {
      const planLimits = {
        free: {
          maxEmployees: 10,
          maxStorage: 100, // MB
          enabledModules: ["attendance", "leave", "employees"],
        },
        basic: {
          maxEmployees: 50,
          maxStorage: 500,
          enabledModules: [
            "attendance",
            "leave",
            "employees",
            "payroll",
            "projects",
          ],
        },
        pro: {
          maxEmployees: 200,
          maxStorage: 2000,
          enabledModules: [
            "attendance",
            "leave",
            "employees",
            "payroll",
            "projects",
            "tasks",
            "timesheet",
          ],
        },
        enterprise: {
          maxEmployees: 9999,
          maxStorage: 10000,
          enabledModules: [
            "attendance",
            "leave",
            "employees",
            "payroll",
            "projects",
            "tasks",
            "timesheet",
            "policies",
          ],
        },
      };

      const newLimits = planLimits[updates.plan];
      if (newLimits) {
        updates.limits = newLimits;
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(id, updates, { new: true });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.json({ message: "Tenant updated successfully", tenant });
  } catch (error) {
    console.error("Update tenant error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Tenant Status
exports.updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended", "trial", "expired"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.json({ message: "Tenant status updated", tenant });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Tenant (Hard Delete - removes all data)
exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    // Find tenant first to verify it exists
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    console.log(`Deleting tenant: ${tenant.companyName} (${id})`);

    // Delete all associated data
    const User = require("../models/User");
    const Employee = require("../models/Employee");
    const Role = require("../models/Role");
    const Leave = require("../models/Leave");
    const Project = require("../models/Project");
    const Payroll = require("../models/Payroll");
    const Task = require("../models/Task");
    const Timesheet = require("../models/Timesheet");
    const Holiday = require("../models/Holiday");

    // Delete all tenant-scoped data
    await Promise.all([
      User.deleteMany({ tenantId: id }),
      Employee.deleteMany({ tenantId: id }),
      Role.deleteMany({ tenantId: id }),
      Leave.deleteMany({ tenantId: id }),
      Project.deleteMany({ tenantId: id }),
      Payroll.deleteMany({ tenantId: id }),
      Task.deleteMany({ tenantId: id }),
      Timesheet.deleteMany({ tenantId: id }),
      Holiday.deleteMany({ tenantId: id }),
    ]);

    console.log(`Deleted all associated data for tenant ${id}`);

    // Finally, delete the tenant itself
    await Tenant.findByIdAndDelete(id);

    console.log(`Tenant ${id} deleted successfully`);

    res.json({
      message: "Tenant and all associated data deleted successfully",
      tenant: { companyName: tenant.companyName, _id: id },
    });
  } catch (error) {
    console.error("Delete tenant error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reset Company Admin Password
exports.resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params; // Tenant ID

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const adminUser = await User.findOne({
      tenantId: tenant._id,
      isCompanyAdmin: true,
    });

    if (!adminUser) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    // Generate new password
    const newPassword = `Temp@${Math.random().toString(36).slice(2, 10)}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    adminUser.passwordHash = passwordHash;
    await adminUser.save();

    res.json({
      message: "Admin password reset successfully",
      email: adminUser.email,
      newPassword,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Platform Analytics
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: "active" });
    const suspendedTenants = await Tenant.countDocuments({
      status: "suspended",
    });
    const trialTenants = await Tenant.countDocuments({ status: "trial" });

    const planDistribution = await Tenant.aggregate([
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalUsers = await User.countDocuments({ tenantId: { $ne: null } });

    res.json({
      overview: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        trialTenants,
        totalUsers,
      },
      planDistribution,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Tenant Usage Details
exports.getTenantUsage = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.json({
      usage: tenant.usage,
      limits: tenant.limits,
      utilization: {
        employees: `${tenant.usage.employeeCount}/${tenant.limits.maxEmployees}`,
        storage: `${tenant.usage.storageUsed}/${tenant.limits.maxStorage} MB`,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update User Status (Global)
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated", user });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete User (Global - Hard Delete)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    // Delete associated employee record
    await Employee.deleteOne({ user: id });

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({ message: "User and associated data deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
