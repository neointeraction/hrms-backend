const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const { authorizePermission } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.post(
  "/",
  authorizePermission(["projects:create"]),
  projectController.createProject
);
router.get(
  "/",
  authorizePermission(["projects:view"]),
  projectController.getProjects
);
router.get(
  "/:id",
  authorizePermission(["projects:view"]),
  projectController.getProjectById
);
router.put(
  "/:id",
  authorizePermission(["projects:edit"]),
  projectController.updateProject
);
router.post(
  "/:id/comments",
  authorizePermission(["projects:view"]),
  projectController.addComment
);
router.delete(
  "/:id",
  authorizePermission(["projects:delete"]),
  projectController.deleteProject
);

module.exports = router;
