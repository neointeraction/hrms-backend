const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// Create Project
exports.createProject = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const { manager, members, name } = req.body;

    const project = new Project({
      ...req.body, // This includes name, description, client, manager, members, startDate, endDate, budget
      tenantId,
      createdBy: req.user.userId,
    });

    await project.save();

    // Notify Manager
    if (manager) {
      await Notification.create({
        recipient: manager,
        tenantId: req.user.tenantId,
        type: "PROJECT",
        title: "New Project Assignment",
        message: `You have been assigned as Project Manager for project: ${name}`,
        relatedId: project._id,
      });
    }

    // Notify Members
    if (members && members.length > 0) {
      const notifications = members.map((memberId) => ({
        recipient: memberId,
        tenantId: req.user.tenantId,
        type: "PROJECT",
        title: "New Project Assignment",
        message: `You have been added to project: ${name}`,
        relatedId: project._id,
      }));
      await Notification.insertMany(notifications);
    }

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Project",
      entityId: project._id,
      action: "create",
      performedBy: req.user.userId,
      metadata: { name: project.name },
      tenantId: tenantId,
    });

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Projects (with filters)
exports.getProjects = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const { status } = req.query;
    let matchStage = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (status) matchStage.status = status;

    const projects = await Project.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "tasks", // Collection name (lowercase plural usually)
          localField: "_id",
          foreignField: "project", // Check Task model if it's 'project' or 'projectId'
          as: "tasks",
        },
      },
      {
        $addFields: {
          taskCount: { $size: "$tasks" },
        },
      },
      {
        $project: {
          tasks: 0, // Remove tasks array to keep payload light
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Populate manager and members manually since aggregate doesn't support populate directly
    await Project.populate(projects, [
      { path: "manager", select: "firstName lastName" },
      { path: "members", select: "firstName lastName" },
    ]);

    res.json({ projects });
  } catch (error) {
    console.error("getProjects Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Single Project
exports.getProjectById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const project = await Project.findOne({ _id: req.params.id, tenantId })
      .populate("manager", "name email")
      .populate("members", "name email")
      .populate({
        path: "comments.createdBy",
        select: "name avatar",
      });

    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Project
exports.updateProject = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // 1. Fetch existing project to compare
    const oldProject = await Project.findOne({ _id: req.params.id, tenantId });
    if (!oldProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    // 2. Perform Update
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      {
        new: true,
      }
    );

    // 3. Calculate Changes
    const changes = {};
    const fieldsToCheck = [
      "name",
      "description",
      "status",
      "startDate",
      "endDate",
      "budget",
      "manager",
    ];

    fieldsToCheck.forEach((field) => {
      if (
        req.body[field] !== undefined &&
        JSON.stringify(req.body[field]) !== JSON.stringify(oldProject[field])
      ) {
        changes[field] = {
          from: oldProject[field],
          to: req.body[field],
        };
      }
    });

    // Check members separately if needed, simplified for now
    if (
      req.body.members &&
      JSON.stringify(req.body.members) !== JSON.stringify(oldProject.members)
    ) {
      changes.members = {
        count_from: oldProject.members.length,
        count_to: req.body.members.length,
      };
    }

    // 4. Log Audit
    if (Object.keys(changes).length > 0) {
      const { createAuditLog } = require("../utils/auditLogger");
      await createAuditLog({
        entityType: "Project",
        entityId: project._id,
        action: "update",
        performedBy: req.user.userId,
        changes: changes,
        metadata: { name: project.name },
        tenantId: tenantId,
      });
    }

    res.json({ message: "Project updated", project });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add Comment
exports.addComment = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      {
        $push: {
          comments: {
            content,
            createdBy: req.user.userId,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("comments.createdBy", "name avatar");

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Notify Manager and Members (exclude sender)
    const senderId = req.user.userId;
    const recipients = new Set();

    if (
      project.manager &&
      project.manager.toString() !== senderId &&
      project.manager.toString() !== senderId.toString()
    ) {
      recipients.add(project.manager.toString());
    }

    if (project.members && project.members.length > 0) {
      project.members.forEach((member) => {
        if (
          member.toString() !== senderId &&
          member.toString() !== senderId.toString()
        ) {
          recipients.add(member.toString());
        }
      });
    }

    if (recipients.size > 0) {
      const notifications = Array.from(recipients).map((recipientId) => ({
        recipient: recipientId,
        tenantId: req.user.tenantId,
        type: "PROJECT",
        title: "New Project Comment",
        message: `New comment in ${project.name}: ${content.substring(0, 50)}${
          content.length > 50 ? "..." : ""
        }`,
        relatedId: project._id,
      }));
      await Notification.insertMany(notifications);
    }

    // Return the newly added comment or the full project
    res.json({ message: "Comment added", project });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}; // Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Log Audit
    const { createAuditLog } = require("../utils/auditLogger");
    await createAuditLog({
      entityType: "Project",
      entityId: project._id,
      action: "delete",
      performedBy: req.user.userId,
      metadata: { name: project.name },
      tenantId: tenantId,
    });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
