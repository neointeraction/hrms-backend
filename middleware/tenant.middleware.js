const Tenant = require("../models/Tenant");

/**
 * Extract tenant context from authenticated user
 * Blocks Super Admin from accessing tenant routes
 */
exports.extractTenant = async (req, res, next) => {
  try {
    // Super Admin should not access tenant routes
    if (req.user && req.user.isSuperAdmin) {
      return res.status(403).json({
        message:
          "Super Admin cannot access tenant routes. Use Super Admin endpoints.",
      });
    }

    // Ensure user has tenant context
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({
        message: "No tenant context found. Please contact your administrator.",
      });
    }

    // Fetch tenant details and attach to request
    const tenant = await Tenant.findById(req.user.tenantId);

    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found. Please contact support.",
      });
    }

    // Check tenant status
    if (tenant.status === "suspended") {
      return res.status(403).json({
        message:
          "Account suspended. Please contact your administrator or support.",
      });
    }

    if (tenant.status === "expired") {
      return res.status(403).json({
        message: "Subscription expired. Please renew your subscription.",
      });
    }

    // Attach tenant to request for easy access
    req.tenant = tenant;

    next();
  } catch (error) {
    console.error("Tenant extraction error:", error);
    return res.status(500).json({
      message: "Error processing tenant context",
    });
  }
};

/**
 * Verify user belongs to a specific tenant (use in params-based lookups)
 */
exports.verifyTenantOwnership = (paramName = "id") => {
  return async (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // This middleware can be extended to verify that a resource
    // with req.params[paramName] belongs to req.tenant._id
    // For now, controllers will handle this via query scoping

    next();
  };
};
