const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://hrms-tool.netlify.app",
      "https://hrms-backend-azure.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Database Connection
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser: true, // Deprecated in newer mongoose but harmless
      // useUnifiedTopology: true,
    });
    isConnected = db.connections[0].readyState;
    console.log("Connected to MongoDB via Middleware");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
};

// DB Middleware - Connect on demand
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database connection failed during request:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Remove top-level connect for Vercel stability
// connectToDatabase();

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
const aiRoutes = require("./routes/ai.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const resignationRoutes = require("./routes/resignation.routes");

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
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/tasks", require("./routes/task.routes"));
app.use("/api/holidays", require("./routes/holiday.routes"));
app.use("/api/leave-policies", require("./routes/leavePolicy.routes"));
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/superadmin", require("./routes/superadmin.routes"));
app.use("/api/registration", require("./routes/registration.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/feedback", feedbackRoutes);
app.use("/api/resignations", resignationRoutes);
app.use("/api/clearance", require("./routes/clearance.routes"));
app.use("/api/badges", require("./routes/badge.routes"));
app.use("/api/appreciation", require("./routes/appreciation.routes"));
app.use("/api/email-automation", require("./routes/email.routes"));
app.use("/api/asset-categories", require("./routes/assetCategory.routes"));
app.use("/api/assets", require("./routes/asset.routes"));
app.use("/api/asset-assignments", require("./routes/assetAssignment.routes"));
app.use("/api/asset-incidents", require("./routes/assetIncident.routes"));
app.use("/api/asset-history", require("./routes/assetHistory.routes"));
app.use("/api/social", require("./routes/social.routes"));
app.use("/api/documents", require("./routes/document.routes"));
app.use("/api/designations", require("./routes/designation.routes"));
app.use("/api/shifts", require("./routes/shift.routes"));
app.use("/api/clients", require("./routes/client.routes"));

app.get("/", (req, res) => {
  res.send("HRM RBAC API is running");
});

const { initCron } = require("./jobs/email.cron");

// ... (existing helper function if needed, or just imports)

// Start Server
if (require.main === module) {
  // Connect to DB immediately on startup for background jobs
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        // Initialize Email Automation Cron
        initCron();
      });
    })
    .catch((err) => {
      console.error("Failed to connect to DB during startup:", err);
      // Optional: process.exit(1) if critical
    });
}

module.exports = app;
