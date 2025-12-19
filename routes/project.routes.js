const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.post("/", projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", projectController.updateProject);
router.post("/:id/comments", projectController.addComment);
router.delete("/:id", projectController.deleteProject);

module.exports = router;
