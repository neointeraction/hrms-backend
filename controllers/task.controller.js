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

    const task = new Task({
      project,
      title,
      description,
      assignee,
      priority,
      dueDate,
      milestone,
      createdBy: req.user.userId,
    });

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
    let query = {};
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
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get My Tasks
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.user.userId })
      .populate("project", "name")
      .populate("assignee", "name")
      .sort({ dueDate: 1 });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
