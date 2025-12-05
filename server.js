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

// Routes
const authRoutes = require("./routes/auth.routes");
const hrRoutes = require("./routes/hr.routes");
const adminRoutes = require("./routes/admin.routes");

app.use("/api/auth", authRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employees", require("./routes/employee.routes"));

app.get("/", (req, res) => {
  res.send("HRM RBAC API is running");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
