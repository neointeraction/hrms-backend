const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Role = require("../models/Role");
const bcrypt = require("bcryptjs");

/**
 * Self-service company registration
 * Creates: Tenant + Default Roles + Company Admin User
 */
exports.registerCompany = async (req, res) => {
  try {
    const {
      companyName,
      adminName,
      adminEmail,
      password,
      subdomain,
      plan = "free",
    } = req.body;

    // Validation
    if (!companyName || !adminName || !adminEmail || !password) {
      return res.status(400).json({
        message: "Company name, admin name, email, and password are required",
      });
    }

    // Check if company name already exists
    const existingTenant = await Tenant.findOne({ companyName });
    if (existingTenant) {
      return res.status(400).json({
        message: "Company name already exists",
      });
    }

    // Check if admin email is already registered
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // Check if subdomain is taken
    if (subdomain) {
      const existingSubdomain = await Tenant.findOne({ subdomain });
      if (existingSubdomain) {
        return res.status(400).json({
          message: "Subdomain already taken",
        });
      }
    }

    // Plan configuration
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

    const limits = planLimits[plan] || planLimits.free;

    // Create Tenant
    const tenant = new Tenant({
      companyName,
      ownerEmail: adminEmail,
      subdomain,
      plan,
      status: plan === "free" ? "active" : "trial", // Free plan is active, others start as trial
      limits,
      subscriptionStart: new Date(),
      subscriptionEnd:
        plan !== "free"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : undefined, // 30 days trial for paid plans
    });
    await tenant.save();

    // Create default roles for this tenant
    const defaultRoles = [
      { name: "Admin", description: "Administrator with full access" },
      { name: "HR", description: "HR Manager" },
      { name: "Project Manager", description: "Project Manager" },
      { name: "Employee", description: "Standard Employee" },
      { name: "Accountant", description: "Accountant" },
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
    const passwordHash = await bcrypt.hash(password, salt);

    const adminUser = new User({
      name: adminName,
      email: adminEmail,
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

    // TODO: Send welcome email

    res.status(201).json({
      message: "Company registered successfully",
      tenant: {
        id: tenant._id,
        companyName: tenant.companyName,
        plan: tenant.plan,
        status: tenant.status,
      },
      admin: {
        name: adminUser.name,
        email: adminUser.email,
      },
    });
  } catch (error) {
    console.error("Company registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};
