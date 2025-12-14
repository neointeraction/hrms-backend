const Tenant = require("../models/Tenant");

/**
 * GET /api/settings/company
 * Get company settings for authenticated tenant
 */
exports.getCompanySettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      company: {
        name: tenant.companyName,
        subdomain: tenant.subdomain,
        timezone: tenant.settings?.timezone || "America/New_York",
        currency: tenant.settings?.currency || "USD",
        workHours: tenant.settings?.workingHours || {
          start: "09:00",
          end: "18:00",
        },
        logo: tenant.settings?.logo,
        favicon: tenant.settings?.favicon,
        dateFormat: tenant.settings?.dateFormat || "MM/DD/YYYY",
        ownerEmail: tenant.ownerEmail,
      },
    });
  } catch (error) {
    console.error("Get company settings error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const cloudinary = require("../config/cloudinary");
const fs = require("fs");

/**
 * PUT /api/settings/company
 * Update company settings (Company Admin only)
 */
exports.updateCompanySettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // Only Company Admin can update settings
    if (!req.user.isCompanyAdmin) {
      return res
        .status(403)
        .json({ message: "Only Company Admin can update settings" });
    }

    const { companyName, timezone, currency, workHours, dateFormat } = req.body;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Update tenant
    if (companyName) tenant.companyName = companyName;

    // Update company settings
    // FIX: Using 'settings' instead of 'companySettings' to match Schema
    if (!tenant.settings) {
      tenant.settings = {};
    }

    if (timezone) tenant.settings.timezone = timezone;
    if (currency) tenant.settings.currency = currency;
    // Handle workHours which might be passed as string or object
    if (workHours) {
      tenant.settings.workingHours =
        typeof workHours === "string" ? JSON.parse(workHours) : workHours;
    }
    if (dateFormat) tenant.settings.dateFormat = dateFormat;

    // Handle File Uploads (Logo & Favicon)
    if (req.files) {
      if (req.files.logo) {
        const result = await cloudinary.uploader.upload(
          req.files.logo[0].path,
          {
            folder: `hrms/tenants/${tenantId}/branding`,
          }
        );
        tenant.settings.logo = result.secure_url;
        // Clean up temp file
        fs.unlinkSync(req.files.logo[0].path);
      }

      if (req.files.favicon) {
        const result = await cloudinary.uploader.upload(
          req.files.favicon[0].path,
          {
            folder: `hrms/tenants/${tenantId}/branding`,
          }
        );
        tenant.settings.favicon = result.secure_url;
        // Clean up temp file
        fs.unlinkSync(req.files.favicon[0].path);
      }
    }

    await tenant.save();

    res.json({
      message: "Company settings updated successfully",
      company: {
        name: tenant.companyName,
        subdomain: tenant.subdomain,
        timezone: tenant.settings.timezone,
        currency: tenant.settings.currency,
        workHours: tenant.settings.workingHours,
        dateFormat: tenant.settings.dateFormat,
        ownerEmail: tenant.ownerEmail,
        logo: tenant.settings.logo,
        favicon: tenant.settings.favicon,
      },
    });
  } catch (error) {
    console.error("Update company settings error:", error);
    // Cleanup files if error occurred
    if (req.files) {
      Object.values(req.files)
        .flat()
        .forEach((file) => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /api/settings/subscription
 * Get subscription details and usage
 */
exports.getSubscriptionDetails = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      subscription: {
        plan: tenant.plan,
        status: tenant.status,
        subscriptionStart: tenant.subscriptionStart,
        subscriptionEnd: tenant.subscriptionEnd,
        limits: {
          maxEmployees: tenant.limits.maxEmployees,
          maxStorage: tenant.limits.maxStorage,
          enabledModules: tenant.limits.enabledModules,
        },
        usage: {
          employeeCount: tenant.usage.employeeCount || 0,
          storageUsed: tenant.usage.storageUsed || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /api/settings/usage
 * Get detailed usage analytics
 */
exports.getUsageAnalytics = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Company not found" });
    }

    const currentEmployees = tenant.usage.employeeCount || 0;
    const maxEmployees = tenant.limits.maxEmployees;
    const employeePercentage = (currentEmployees / maxEmployees) * 100;

    const storageUsed = tenant.usage.storageUsed || 0;
    const maxStorage = tenant.limits.maxStorage;
    const storagePercentage = (storageUsed / maxStorage) * 100;

    res.json({
      employees: {
        current: currentEmployees,
        limit: maxEmployees,
        percentage: employeePercentage.toFixed(1),
        trend: [], // TODO: Implement historical tracking
      },
      storage: {
        used: storageUsed,
        limit: maxStorage,
        percentage: storagePercentage.toFixed(1),
        breakdown: {
          documents: 0, // TODO: Calculate from actual files
          profilePictures: 0,
          payslips: 0,
        },
      },
      modules: {
        enabled: tenant.limits.enabledModules,
        disabled: getAllModules().filter(
          (m) => !tenant.limits.enabledModules.includes(m)
        ),
      },
    });
  } catch (error) {
    console.error("Get usage analytics error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * POST /api/settings/upgrade-plan
 * Initiate plan upgrade (Stripe prep)
 */
exports.upgradePlan = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { newPlan } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    if (!req.user.isCompanyAdmin) {
      return res
        .status(403)
        .json({ message: "Only Company Admin can upgrade plan" });
    }

    const validPlans = ["free", "basic", "pro", "enterprise"];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Company not found" });
    }

    // TODO: Integration with Stripe for payment
    // For now, just return a placeholder response
    res.json({
      message: "Plan upgrade will be available in Week 5 (Stripe integration)",
      requestedPlan: newPlan,
      currentPlan: tenant.plan,
      // checkoutUrl: "https://checkout.stripe.com/..." // Week 5
    });
  } catch (error) {
    console.error("Upgrade plan error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to get all available modules
function getAllModules() {
  return [
    "attendance",
    "leave",
    "employees",
    "payroll",
    "projects",
    "tasks",
    "timesheet",
    "policies",
  ];
}
