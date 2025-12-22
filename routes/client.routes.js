const express = require("express");
const router = express.Router();
const clientController = require("../controllers/client.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const { authorizePermission } = require("../middleware/auth.middleware");

// All routes are protected
router.use(authenticateToken);

router.get(
  "/",
  authorizePermission(["clients:view"]),
  clientController.getClients
);
router.get(
  "/:id",
  authorizePermission(["clients:view"]),
  clientController.getClientById
);
router.post(
  "/",
  authorizePermission(["clients:create"]),
  clientController.createClient
);
router.put(
  "/:id",
  authorizePermission(["clients:edit"]),
  clientController.updateClient
);
router.delete(
  "/:id",
  authorizePermission(["clients:delete"]),
  clientController.deleteClient
);

module.exports = router;
