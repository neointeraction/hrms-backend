const jwt = require("jsonwebtoken");

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

exports.authorizePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ message: "Access denied" });
    }

    const hasPermission = requiredPermissions.some((permission) =>
      req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
    }

    next();
  };
};

exports.authorize = (allowedRoles = []) => {
  // allowedRoles param can be a single string 'Role' or an array of ['Role']
  if (typeof allowedRoles === "string") {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    console.log("[DEBUG] authorize middleware:");
    console.log("  - req.user:", req.user);
    console.log("  - req.user.roles:", req.user?.roles);
    console.log("  - allowed roles:", allowedRoles);

    if (!req.user) {
      return res.status(403).json({ message: "Access denied: No user found" });
    }

    // Check if user has roles array and if any of user's roles match allowed roles
    const userRoles = req.user.roles || [];
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    const hasMatchingRole = userRoles.some((userRole) =>
      normalizedAllowed.includes(userRole.toLowerCase())
    );

    console.log("  - user roles:", userRoles);
    console.log("  - role match:", hasMatchingRole);

    if (allowedRoles.length && !hasMatchingRole) {
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient privileges" });
    }

    next();
  };
};
