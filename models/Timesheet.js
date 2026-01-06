const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    project: {
      type: String,
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    task: {
      type: String,
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    startTime: {
      type: String, // Format: "HH:mm"
      required: true,
    },
    endTime: {
      type: String, // Format: "HH:mm"
      required: true,
    },
    hours: {
      type: Number,
      default: 0,
    },
    description: String,
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
    entryType: {
      type: String,
      enum: ["manual", "timer"],
      default: "manual",
    },
    weekEnding: {
      type: Date,
      required: true,
    },
    submittedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewComments: String,
  },
  { timestamps: true }
);

// Calculate hours before saving
timesheetSchema.pre("save", function () {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(":").map(Number);
    const [endHour, endMin] = this.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Handle overnight shifts
    }

    this.hours = Math.round((diffMinutes / 60) * 100) / 100;
  }
});

module.exports = mongoose.model("Timesheet", timesheetSchema);
