/**
 * Require Company Admin role
 * Allows users with isCompanyAdmin flag or Admin role
 */
exports.requireCompanyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const isCompanyAdmin = req.user.isCompanyAdmin;
  const hasAdminRole = req.user.roles && req.user.roles.includes("Admin");

  if (!isCompanyAdmin && !hasAdminRole) {
    return res.status(403).json({
      message: "Company Admin access required",
    });
  }

  next();
};
