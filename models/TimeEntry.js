const mongoose = require("mongoose");

const timeEntrySchema = new mongoose.Schema(
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
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
    },
    breaks: [
      {
        breakStart: Date,
        breakEnd: Date,
      },
    ],
    totalHours: {
      type: Number,
      default: 0,
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    completedTasks: String,
    notes: String,
  },
  { timestamps: true }
);

// Calculate total hours before saving
timeEntrySchema.pre("save", function () {
  if (this.clockIn && this.clockOut) {
    const totalMs = this.clockOut - this.clockIn;

    // Calculate total break time
    let totalBreakMs = 0;
    if (this.breaks && this.breaks.length > 0) {
      this.breaks.forEach((breakEntry) => {
        if (breakEntry.breakStart && breakEntry.breakEnd) {
          totalBreakMs += breakEntry.breakEnd - breakEntry.breakStart;
        }
      });
    }

    this.totalBreakMinutes = Math.round(totalBreakMs / 1000 / 60);

    // Total hours = (clock out - clock in) - breaks
    const workMs = totalMs - totalBreakMs;
    this.totalHours = Math.round((workMs / 1000 / 60 / 60) * 100) / 100;
  }
});

module.exports = mongoose.model("TimeEntry", timeEntrySchema);
