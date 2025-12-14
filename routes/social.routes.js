const express = require("express");
const router = express.Router();
const socialController = require("../controllers/social.controller");
const authMiddleware = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const os = require("os");

// Setup Multer for temp storage before Cloudinary upload
// Use system temp directory ensures compatibility with readonly filesystems (like Vercel/Lambda)
const uploadDir = path.join(os.tmpdir(), "hrms-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

router.use(authMiddleware.authenticateToken);

// Feed
router.get("/check-new", socialController.checkNewPosts);
router.get("/feed", socialController.getFeed);

// Posts
router.post("/posts", socialController.createPost);
router.put("/posts/:id", socialController.updatePost);
router.delete("/posts/:id", socialController.deletePost);

// Interactions
router.post("/posts/:id/react", socialController.toggleReaction);
router.post("/posts/:id/vote", socialController.votePoll);

// Comments
router.get("/posts/:id/comments", socialController.getComments);
router.post("/posts/:id/comments", socialController.addComment);
router.post("/comments/:id/react", socialController.toggleCommentReaction);

// Media Upload
router.post(
  "/upload-media",
  upload.single("file"),
  socialController.uploadMedia
);

module.exports = router;
