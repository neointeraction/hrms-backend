const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
// const { authenticateToken, authorizeRole } = require("../middleware/auth.middleware");

// TODO: Add auth middleware
// router.use(authenticateToken);

router.post("/", employeeController.createEmployee);
router.get("/", employeeController.getEmployees);
router.get("/:id", employeeController.getEmployeeById);
router.put("/:id", employeeController.updateEmployee);

module.exports = router;
