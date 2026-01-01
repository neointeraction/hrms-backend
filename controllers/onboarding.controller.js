const Employee = require("../models/Employee");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const Role = require("../models/Role");
const emailService = require("../services/email.service");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 1. HR: Invite Employee
exports.inviteEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // ... imports
    const { generateOfferLetter } = require("../utils/pdfGenerator");

    // ... inside inviteEmployee
    const {
      firstName,
      lastName,
      email,
      role: roleName,
      salary,
      joiningDate,
      designation,
    } = req.body;
    const tenantId = req.user.tenantId;

    // Check Limits
    const tenant = await Tenant.findById(tenantId);
    const currentCount = await Employee.countDocuments({ tenantId });
    if (currentCount >= tenant.limits.maxEmployees) {
      throw new Error(`Employee limit reached for your ${tenant.plan} plan.`);
    }

    // Check Existence
    const existingEmp = await Employee.findOne({ email, tenantId });
    if (existingEmp) {
      if (
        existingEmp.onboarding &&
        existingEmp.onboarding.status === "Pending"
      ) {
        return res.status(400).json({
          message: "Employee already invited. Resend invite instead.",
        });
      }
      throw new Error("Employee with this email already exists.");
    }

    // Generate Token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Generate Temp Employee ID (e.g., INV-001)
    const tempId = `INV-${Date.now().toString().slice(-6)}`;

    // Create "Invited" Employee
    const newEmployee = new Employee({
      tenantId,
      employeeId: tempId, // Temporary ID
      firstName,
      lastName,
      email,
      role: roleName,
      employeeStatus: "Invited",
      onboarding: {
        status: "Pending",
        token,
        tokenExpires,
        checklist: [],
      },
      addedBy: req.user.userId,
    });

    await newEmployee.save({ session });

    // Generate Offer Letter
    let attachments = [];
    try {
      const offerLetterBuffer = await generateOfferLetter(
        { firstName, lastName, role: roleName },
        { salary, joiningDate, designation },
        {
          name: tenant.name || tenant.companyName || "Our Company",
          logo: tenant.settings?.logo, // Pass logo path
        }
      );

      attachments.push({
        filename: "Offer_Letter.pdf",
        content: offerLetterBuffer,
      });
    } catch (pdfErr) {
      console.error("Failed to generate Offer Letter:", pdfErr);
      // Continue without attachment? Or fail? Let's log and continue for now, or maybe throw if critical.
      // throw new Error("Failed to generate Offer Letter");
    }

    // ... create employee ...

    // Send Email
    const inviteLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/onboarding/start/${token}`;
    await emailService.sendEmail({
      to: email,
      subject: "Welcome! Complete your Onboarding",
      html: `
        <h3>Welcome ${firstName},</h3>
        <p>You have been invited to join <b>${
          tenant.name || "our company"
        }</b>.</p>
        <p>We are excited to have you on board. Please find your Offer Letter attached.</p>
        <p>To accept the offer and start your onboarding, please click the link below:</p>
        <br/>
        <a href="${inviteLink}" style="padding: 10px 20px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px;">Start Onboarding</a>
        <br/><br/>
        <p>This link is valid for 7 days.</p>
      `,
      attachments,
    });

    await session.commitTransaction();
    res
      .status(201)
      .json({ message: "Invite sent successfully", employee: newEmployee });
  } catch (err) {
    await session.abortTransaction();
    console.error("Invite Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// 2. Public: Validate Token & Get Initial Data
exports.validateToken = async (req, res) => {
  try {
    const { token } = req.params;
    const employee = await Employee.findOne({
      "onboarding.token": token,
      "onboarding.tokenExpires": { $gt: Date.now() },
    }).select(
      "firstName lastName email onboarding.status onboarding.currentStep onboarding.documents personalMobile dateOfBirth presentAddress pan aadhaar bankDetails"
    );

    if (!employee) {
      return res
        .status(404)
        .json({ message: "Invalid or expired invitation link." });
    }

    // BLOCK ACCESS if already Submitted or Approved
    const status = employee.onboarding.status;
    if (status === "Submitted" || status === "Approved") {
      return res.status(403).json({
        message: "Application submitted. Access restricted during review.",
      });
    }

    res.json(employee);
  } catch (err) {
    console.error("Token Validate Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Public: Save/Submit Onboarding Step
exports.saveOnboardingStep = async (req, res) => {
  try {
    const { token } = req.params;
    const { step, data, isFinalSubmission } = req.body;

    const employee = await Employee.findOne({
      "onboarding.token": token,
      "onboarding.tokenExpires": { $gt: Date.now() },
    });

    if (!employee) {
      return res.status(404).json({ message: "Invalid token" });
    }

    // Update Data based on step
    if (step === 1) {
      if (data.mobile) employee.personalMobile = data.mobile;
      if (data.dob) employee.dateOfBirth = data.dob;
      if (data.address) employee.presentAddress = data.address;
      if (data.pan) employee.pan = data.pan;
      if (data.aadhaar) employee.aadhaar = data.aadhaar;
      // Also update name if changed? usually locked but good to have
    } else if (step === 2) {
      if (data.documents) {
        employee.onboarding.documents = data.documents;
      }
    } else if (step === 3) {
      if (data.bankDetails) {
        employee.bankDetails = data.bankDetails;
      }
    }

    employee.onboarding.currentStep = step;

    if (isFinalSubmission) {
      employee.onboarding.status = "Submitted";
      employee.employeeStatus = "Review";

      // Notify HR (who added the employee)
      try {
        if (employee.addedBy) {
          const User = require("../models/User");
          const hrUser = await User.findById(employee.addedBy);
          if (hrUser && hrUser.email) {
            await emailService.sendEmail({
              to: hrUser.email,
              subject: `Onboarding Submitted: ${employee.firstName} ${employee.lastName}`,
              html: `
                <h3>Onboarding Submitted</h3>
                <p>Candidate <b>${employee.firstName} ${employee.lastName}</b> has completed their onboarding form.</p>
                <p>Please review and approve their profile in the HRMS dashboard.</p>
                <br/>
                <a href="${process.env.FRONTEND_URL}/dashboard/employees?tab=onboarding">View Onboarding Requests</a>
              `,
            });
            console.log(
              `[Onboarding] Notification sent to HR: ${hrUser.email}`
            );
          }
        }
      } catch (emailErr) {
        console.error("Failed to send HR notification email:", emailErr);
        // Don't block submission if email fails
      }
    } else {
      employee.onboarding.status = "In Progress";
      employee.employeeStatus = "Onboarding";
    }

    await employee.save();
    res.json({ message: "Progress saved", status: employee.onboarding.status });
  } catch (err) {
    console.error("Save Onboarding Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 4. Public: Upload Document
exports.uploadDocument = async (req, res) => {
  try {
    const { token } = req.params;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const employee = await Employee.findOne({
      "onboarding.token": token,
      "onboarding.tokenExpires": { $gt: Date.now() },
    });

    if (!employee) return res.status(404).json({ message: "Invalid token" });

    const url = req.file.path.replace(/\\/g, "/"); // Normalize path
    const docName = req.body.docName || req.file.originalname;

    // Add to documents list
    employee.onboarding.documents.push({
      name: docName,
      url: url,
      status: "Uploaded",
    });

    await employee.save();
    res.json({
      message: "File uploaded",
      url,
      documents: employee.onboarding.documents,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 5. Admin: Approve Onboarding
exports.approveEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId);

    if (!employee) throw new Error("Employee not found");
    if (employee.tenantId.toString() !== req.user.tenantId)
      throw new Error("Unauthorized");

    // Create User Account
    const existingUser = await User.findOne({ email: employee.email });
    if (existingUser)
      throw new Error("User account already exists for this email");

    const tempPassword = Math.random().toString(36).slice(-8) + "1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Find Role
    let userRole = await Role.findOne({
      name: employee.role || "Employee",
      tenantId: employee.tenantId,
    });
    if (!userRole) {
      // Fallback to finding any default role if specific one missing
      userRole = await Role.findOne({
        name: "Employee",
        tenantId: employee.tenantId,
      });
    }

    const newUser = new User({
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      passwordHash: hashedPassword,
      roles: userRole ? [userRole._id] : [],
      tenantId: employee.tenantId,
      status: "active",
      employeeId: employee.employeeId,
      designation: employee.designation, // Transfer from Invite
      department: employee.department, // Transfer from Invite if present
    });

    await newUser.save({ session });

    // Update Employee
    employee.user = newUser._id;
    employee.employeeStatus = "Probation"; // or Active
    employee.onboarding.status = "Approved";
    employee.joiningDate = new Date(); // Set current date as joining? or use provided

    await employee.save({ session });

    // Send Activation Email
    await emailService.sendEmail({
      to: employee.email,
      subject: "Onboarding Approved - Account Details",
      html: `
            <h3>Welcome Aboard, ${employee.firstName}!</h3>
            <p>Your onboarding has been approved.</p>
            <p>Here are your login credentials:</p>
            <p><b>Email:</b> ${employee.email}</p>
            <p><b>Password:</b> ${tempPassword}</p>
            <br/>
            <a href="${process.env.FRONTEND_URL}/login">Login Here</a>
        `,
    });

    await session.commitTransaction();
    res.json({ message: "Employee approved and user account created." });
  } catch (err) {
    await session.abortTransaction();
    console.error("Approve Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// 6. Admin: Reject Onboarding
exports.rejectEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { reason } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    employee.onboarding.status = "Rejected";

    // For now, mark as Invited to allow resubmission
    employee.employeeStatus = "Invited";

    // EXTEND TOKEN validity by 7 days to allow user to edit
    employee.onboarding.tokenExpires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await employee.save();

    const editLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/onboarding/start/${employee.onboarding.token}`;

    // Send Rejection Email
    await emailService.sendEmail({
      to: employee.email,
      subject: "Action Required: Onboarding Corrections Needed",
      html: `
            <h3>Hello ${employee.firstName},</h3>
            <p>Your onboarding submission was reviewed and requires some changes.</p>
            <p><b>Reason for Return:</b> ${reason}</p>
            <p>Please click the link below to update your details and re-submit:</p>
            <br/>
            <a href="${editLink}" style="padding: 10px 20px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px;">Update Onboarding Details</a>
            <br/><br/>
            <p>This link is valid for another 7 days.</p>
        `,
    });

    res.json({ message: "Onboarding returned to employee for changes." });
  } catch (err) {
    console.error("Reject Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
