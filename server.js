const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Serve Uploads
app.use("/uploads", express.static("uploads"));

// Routes
const authRoutes = require("./routes/auth.routes");
const hrRoutes = require("./routes/hr.routes");
const employeeRoutes = require("./routes/employee.routes");
const adminRoutes = require("./routes/admin.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const timesheetRoutes = require("./routes/timesheet.routes");
const timeCorrectionRoutes = require("./routes/timeCorrection.routes");
const auditRoutes = require("./routes/audit.routes");
const notificationRoutes = require("./routes/notification.routes");

app.use("/api/auth", authRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/time-correction", timeCorrectionRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/leave", require("./routes/leave.routes"));
app.use("/api/payroll", require("./routes/payroll.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/tasks", require("./routes/task.routes"));
app.use("/api/holidays", require("./routes/holiday.routes"));
app.use("/api/leave-policies", require("./routes/leavePolicy.routes"));
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("HRM RBAC API is running");
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
