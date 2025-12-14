const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification"); // For mentions
const User = require("../models/User"); // For finding usage by name if needed
const Employee = require("../models/Employee"); // Need this to verify authors
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// Get Social Feed
exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, scope } = req.query;
    const skip = (page - 1) * limit;

    const query = { tenantId: req.user.tenantId };
    if (type) query.type = type;
    if (scope) query.scope = scope;

    // Fetch posts with author details
    // Also consider pinning logic: Pinned posts first?
    // MongoDB sort by isPinned then createdAt is good.
    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate(
        "author",
        "firstName lastName profilePicture designation employeeId"
      )
      .populate("reactions.user", "firstName lastName employeeId")
      .populate({
        path: "relatedAppreciationId",
        populate: [
          { path: "sender", select: "firstName lastName" },
          { path: "recipient", select: "firstName lastName" },
          { path: "badge" },
        ],
      });

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Get Feed Error:", error);
    res.status(500).json({ message: "Failed to fetch social feed" });
  }
};

// Create Post
exports.createPost = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const newPost = new Post({
      ...req.body,
      tenantId: req.user.tenantId,
      author: employee._id,
    });

    await newPost.save();

    // Populate author for immediate display on frontend
    await newPost.populate(
      "author",
      "firstName lastName profilePicture designation employeeId"
    );

    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });

    // Notify mentioned users
    // Simple regex for @FirstName (case insensitive)
    const mentionRegex = /@(\w+)/g;
    const matches = [...newPost.content.matchAll(mentionRegex)];
    const uniqueNames = [...new Set(matches.map((m) => m[1]))];

    if (uniqueNames.length > 0) {
      // Find potential users
      // This is a naive implementation; ideally we'd have IDs.
      // Searching by firstName for MVP.
      const mentionedEmployees = await Employee.find({
        firstName: { $in: uniqueNames.map((n) => new RegExp(`^${n}$`, "i")) },
        tenantId: req.user.tenantId,
      });

      const notifications = mentionedEmployees
        .filter((emp) => emp.user.toString() !== req.user.userId) // Don't notify self
        .map((emp) => ({
          recipient: emp.user,
          tenantId: req.user.tenantId,
          type: "MENTION",
          title: "New Mention",
          message: `${employee.firstName} mentioned you in a post`,
          relatedId: newPost._id,
        }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }
  } catch (error) {
    console.error("Create Post Error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// Update Post
exports.updatePost = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check permission: Author only
    const employee = await Employee.findOne({ user: req.user.userId });
    if (post.author.toString() !== employee._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    // Update fields
    post.content = content;
    // We could add "isEdited" flag if schema supports it, effectively generic for now.

    await post.save();

    // Re-populate for frontend consistency
    await post.populate(
      "author",
      "firstName lastName profilePicture designation employeeId"
    );
    await post.populate("reactions.user", "firstName lastName employeeId");

    // If appreciation, deep populate might be needed, but usually content edit doesn't change appreciation data
    if (post.type === "appreciation") {
      await post.populate({
        path: "relatedAppreciationId",
        populate: [
          { path: "sender", select: "firstName lastName" },
          { path: "recipient", select: "firstName lastName" },
          { path: "badge" },
        ],
      });
    }

    res.json({ message: "Post updated successfully", post });
  } catch (error) {
    console.error("Update Post Error:", error);
    res.status(500).json({ message: "Failed to update post" });
  }
};

// Delete Post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check permission: Author or Admin
    const employee = await Employee.findOne({ user: req.user.userId });
    // Assuming req.user.role is available
    const isAdmin = ["admin", "hr_manager"].includes(req.user.role);
    const isAuthor = post.author.toString() === employee._id.toString();

    if (!isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ postId: req.params.id }); // Clean up comments

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

// Toggle Reaction
exports.toggleReaction = async (req, res) => {
  try {
    const { type } = req.body; // 'like', 'celebrate', etc.
    const employee = await Employee.findOne({ user: req.user.userId });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if user already reacted
    const existingReactionIndex = post.reactions.findIndex(
      (r) => r.user.toString() === employee._id.toString()
    );

    if (existingReactionIndex > -1) {
      // If same type, remove it (toggle off)
      if (post.reactions[existingReactionIndex].type === type) {
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // If different type, update it
        post.reactions[existingReactionIndex].type = type;
      }
    } else {
      // Add new reaction
      post.reactions.push({ user: employee._id, type });
    }

    await post.save();

    // Populate reactions before returning
    await post.populate("reactions.user", "firstName lastName employeeId");

    res.json({ reactions: post.reactions });
  } catch (error) {
    console.error("Reaction Error:", error);
    res.status(500).json({ message: "Failed to update reaction" });
  }
};

// Vote on Poll
exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const employee = await Employee.findOne({ user: req.user.userId });
    const post = await Post.findById(req.params.id);

    if (!post || post.type !== "poll") {
      return res.status(404).json({ message: "Poll not found" });
    }

    // Check if multiple votes allowed
    // For simplicity, let's assume single vote per user per poll for now unless 'allowMultiple' is handled strictly
    // First, remove user's vote from ANY option if allowMultiple is false
    if (!post.pollData.allowMultiple) {
      post.pollData.options.forEach((opt) => {
        const voteIdx = opt.votes.findIndex(
          (v) => v.toString() === employee._id.toString()
        );
        if (voteIdx > -1) opt.votes.splice(voteIdx, 1);
      });
    }

    // Add vote to target option
    // Check if user already voted on THIS option (toggle off?)
    // Typically polls aren't toggle off but let's stick to "Vote" logic

    // Check if already voted on this specific option
    const targetOption = post.pollData.options[optionIndex];
    if (!targetOption)
      return res.status(400).json({ message: "Invalid option" });

    const existingVote = targetOption.votes.find(
      (v) => v.toString() === employee._id.toString()
    );
    if (!existingVote) {
      targetOption.votes.push(employee._id);
    }

    await post.save();
    res.json({ pollData: post.pollData });
  } catch (error) {
    console.error("Poll Vote Error:", error);
    res.status(500).json({ message: "Failed to vote" });
  }
};

// Get Comments
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id })
      .populate("author", "firstName lastName profilePicture")
      .sort({ createdAt: 1 });
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

// Add Comment
exports.addComment = async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const employee = await Employee.findOne({ user: req.user.userId });

    const comment = new Comment({
      postId: req.params.id,
      author: employee._id,
      content,
      parentId: parentId || null,
    });

    await comment.save();

    // Increment post comment count
    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });

    await comment.populate("author", "firstName lastName profilePicture");

    res.status(201).json({ comment });

    // Notify mentioned users in comments
    const mentionRegex = /@(\w+)/g;
    const matches = [...comment.content.matchAll(mentionRegex)];
    const uniqueNames = [...new Set(matches.map((m) => m[1]))];

    if (uniqueNames.length > 0) {
      const mentionedEmployees = await Employee.find({
        firstName: { $in: uniqueNames.map((n) => new RegExp(`^${n}$`, "i")) },
        tenantId: req.user.tenantId,
      });

      const notifications = mentionedEmployees
        .filter((emp) => emp.user.toString() !== req.user.userId)
        .map((emp) => ({
          recipient: emp.user,
          tenantId: req.user.tenantId,
          type: "MENTION",
          title: "New Mention",
          message: `${employee.firstName} mentioned you in a comment`,
          relatedId: comment.postId,
        }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// Toggle Comment Reaction
exports.toggleCommentReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const employee = await Employee.findOne({ user: req.user.userId });
    const comment = await Comment.findById(req.params.id);

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const existingReactionIndex = comment.reactions.findIndex(
      (r) => r.user.toString() === employee._id.toString()
    );

    if (existingReactionIndex > -1) {
      if (comment.reactions[existingReactionIndex].type === type) {
        comment.reactions.splice(existingReactionIndex, 1);
      } else {
        comment.reactions[existingReactionIndex].type = type;
      }
    } else {
      comment.reactions.push({ user: employee._id, type });
    }

    await comment.save();
    // Populate reactions for immediate update
    // Note: Comment.js reaction schema ref is 'Employee'
    // Mongoose subdocument population works best if structured right.
    // Let's populate the user field in reactions if needed, but for count/type simple ID is mostly enough for optimistic UI
    // But frontend might want names for hover.
    // Not critical for MVP, returning comments usually happens via getComments, but returning updated comment here is good.

    // Simulating return of updated reactions array
    res.json({ reactions: comment.reactions });
  } catch (error) {
    console.error("Comment Reaction Error:", error);
    res.status(500).json({ message: "Failed to react to comment" });
  }
};

// Upload Media (Cloudinary)
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Verify file type if needed, but multer usually handles basic filtering
    // Upload to Cloudinary
    // Note: If using 'multer-storage-cloudinary', req.file.path is the URL.
    // If using standard multer (disk/memory), we upload explicitly.
    // Let's assume standard disk storage for now and explicit upload.

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `hrms/${req.user.tenantId}/social`,
      resource_type: "auto", // Detect image/video
    });

    // Remove local file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error("Upload Error:", error);
    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Media upload failed" });
  }
};

// Check for new posts
exports.checkNewPosts = async (req, res) => {
  try {
    const { lastChecked } = req.query;
    const query = { tenantId: req.user.tenantId };

    // Only return posts created AFTER the last check
    if (lastChecked) {
      query.createdAt = { $gt: new Date(lastChecked) };
    }

    const count = await Post.countDocuments(query);

    // Optional: Get the latest post for notification details
    let latestPost = null;
    if (count > 0) {
      latestPost = await Post.findOne(query)
        .sort({ createdAt: -1 })
        .populate("author", "firstName lastName");
    }

    res.json({ count, latestPost });
  } catch (error) {
    console.error("Check New Posts Error:", error);
    res.status(500).json({ message: "Failed to check new posts" });
  }
};
