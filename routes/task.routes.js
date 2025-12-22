const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const { authorizePermission } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.post(
  "/",
  authorizePermission(["projects:task_create"]),
  taskController.createTask
);
router.get("/", authorizePermission(["projects:task_view"]), taskController.getTasks);
router.get(
  "/my-tasks",
  authorizePermission(["projects:task_view"]),
  taskController.getMyTasks
);
router.put(
  "/:id",
  authorizePermission(["projects:task_edit"]),
  taskController.updateTask
);

module.exports = router;
