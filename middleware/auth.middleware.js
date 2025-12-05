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
