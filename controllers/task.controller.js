const Task = require("../models/Task");

// Create Task
exports.createTask = async (req, res) => {
  try {
    const {
      project,
      title,
      description,
      assignee,
      priority,
      dueDate,
      milestone,
    } = req.body;

    // Validate Status/Priority? Mongoose does it, but we can prevent 500 if we want custom message.

    // Handle empty assignee which causes CastError
    const taskData = {
      project,
      title,
      description,
      priority,
      dueDate,
      milestone,
      createdBy: req.user.userId,
      tenantId: req.user.tenantId, // Add tenantId
    };

    if (assignee && assignee.trim() !== "") {
      taskData.assignee = assignee;
    }

    const task = new Task(taskData);

    await task.save();
    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Tasks by Project
exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.query;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    let query = { tenantId }; // Default to tenant scope
    if (projectId) query.project = projectId;

    const tasks = await Task.find(query)
      .populate("assignee", "name email")
      .populate("project", "name")
      .sort({ dueDate: 1 }); // Sort by due date usually

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Task (Status/Assignee etc)
exports.updateTask = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenantId }, // Find by ID and tenantId
      req.body,
      { new: true }
    );
    if (!task)
      return res
        .status(404)
        .json({ message: "Task not found or not authorized" });
    res.json({ message: "Task updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = exports;

// Get My Tasks
exports.getMyTasks = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const tasks = await Task.find({ assignee: req.user.userId, tenantId }) // Filter by assignee and tenantId
      .populate("project", "name")
      .populate("assignee", "name")
      .sort({ dueDate: 1 });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Tasks (for a tenant)
exports.getAllTasks = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const tasks = await Task.find({ tenantId })
      .populate("assignee", "firstName lastName")
      .populate("project", "name")
      .sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
