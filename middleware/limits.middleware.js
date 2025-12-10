const Tenant = require("../models/Tenant");
const Employee = require("../models/Employee");

/**
 * Check if tenant has reached employee limit
 * Prevents adding new employees if limit is reached
 */
exports.checkEmployeeLimit = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const currentCount = req.tenant.usage.employeeCount || 0;
    const maxAllowed = req.tenant.limits.maxEmployees;

    if (currentCount >= maxAllowed) {
      return res.status(403).json({
        message: `Employee limit reached (${maxAllowed}). Please upgrade your plan to add more employees.`,
        limit: maxAllowed,
        current: currentCount,
      });
    }

    next();
  } catch (error) {
    console.error("Employee limit check error:", error);
    return res.status(500).json({ message: "Error checking employee limit" });
  }
};

/**
 * Check if tenant has specific module enabled
 * Usage: checkModuleAccess('payroll')
 */
exports.checkModuleAccess = (moduleName) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const enabledModules = req.tenant.limits.enabledModules || [];

    if (!enabledModules.includes(moduleName)) {
      return res.status(403).json({
        message: `Module '${moduleName}' is not enabled in your plan. Please upgrade to access this feature.`,
        currentPlan: req.tenant.plan,
        module: moduleName,
      });
    }

    next();
  };
};

/**
 * Check storage limit before file upload
 * Usage: checkStorageLimit(req.file.size)
 */
exports.checkStorageLimit = (fileSizeInBytes) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({ message: "No tenant context" });
      }

      const fileSizeMB = fileSizeInBytes / (1024 * 1024);
      const currentUsage = req.tenant.usage.storageUsed || 0;
      const maxStorage = req.tenant.limits.maxStorage;

      if (currentUsage + fileSizeMB > maxStorage) {
        return res.status(403).json({
          message: `Storage limit reached (${maxStorage} MB). Please upgrade your plan or delete unused files.`,
          limit: maxStorage,
          current: currentUsage,
          required: fileSizeMB,
        });
      }

      next();
    } catch (error) {
      console.error("Storage limit check error:", error);
      return res.status(500).json({ message: "Error checking storage limit" });
    }
  };
};

/**
 * Increment employee count after successful creation
 */
exports.incrementEmployeeCount = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return next();
    }

    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $inc: { "usage.employeeCount": 1 },
    });

    next();
  } catch (error) {
    console.error("Error incrementing employee count:", error);
    // Don't block the request, just log
    next();
  }
};

/**
 * Decrement employee count after deletion
 */
exports.decrementEmployeeCount = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return next();
    }

    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $inc: { "usage.employeeCount": -1 },
    });

    next();
  } catch (error) {
    console.error("Error decrementing employee count:", error);
    // Don't block the request, just log
    next();
  }
};

/**
 * Update storage usage
 * @param {number} sizeDeltaMB - Positive for increase, negative for decrease
 */
exports.updateStorageUsage = (sizeDeltaMB) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return next();
      }

      await Tenant.findByIdAndUpdate(req.tenant._id, {
        $inc: { "usage.storageUsed": sizeDeltaMB },
      });

      next();
    } catch (error) {
      console.error("Error updating storage usage:", error);
      // Don't block the request, just log
      next();
    }
  };
};
