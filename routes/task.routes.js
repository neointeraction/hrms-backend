const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.post("/", taskController.createTask);
router.get("/", taskController.getTasks);
router.get("/my-tasks", taskController.getMyTasks); // Must come before :id to match correctly if not strict regex
router.put("/:id", taskController.updateTask);

module.exports = router;
