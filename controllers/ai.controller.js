const PolicyDocument = require("../models/PolicyDocument");
const Tenant = require("../models/Tenant");
const aiService = require("../utils/ai.service");
const fs = require("fs");
const pdf = require("pdf-parse");

// Upload and Parse Policy Document
exports.uploadPolicy = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedPolicies = [];
    const errors = [];

    // Process each file
    for (const file of req.files) {
      try {
        // Read file buffer
        const dataBuffer = fs.readFileSync(file.path);

        // Parse PDF
        const data = await pdf(dataBuffer);
        const textContent = data.text;

        if (!textContent || textContent.trim().length === 0) {
          errors.push({
            file: file.originalname,
            error: "Extracted text is empty",
          });
          continue;
        }

        // Save new policy (Additive model - do not deactivate others)
        const newPolicy = new PolicyDocument({
          filename: file.path,
          originalName: file.originalname,
          textContent: textContent,
          uploadedBy: req.user.userId,
          tenantId: req.user.tenantId,
          isActive: true,
        });

        await newPolicy.save();
        uploadedPolicies.push({
          id: newPolicy._id,
          filename: newPolicy.originalName,
          uploadedAt: newPolicy.createdAt,
        });
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        errors.push({
          file: file.originalname,
          error: "Failed to parse or save",
        });
      }
    }

    if (uploadedPolicies.length === 0 && errors.length > 0) {
      return res.status(400).json({
        message: "Failed to upload any documents",
        errors,
      });
    }

    res.status(201).json({
      message: `Successfully processed ${uploadedPolicies.length} documents`,
      policies: uploadedPolicies,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Upload Policy Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Ask Question to AI
exports.askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    // 1. Get Tenant Configuration
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant context not found" });
    }

    if (tenant.aiConfig && tenant.aiConfig.enabled === false) {
      return res.status(403).json({
        message: "AI Assistant is currently disabled for your organization.",
      });
    }

    // 2. Get ALL active policies for THIS tenant
    const activePolicies = await PolicyDocument.find({
      isActive: true,
      tenantId: req.user.tenantId,
    });

    if (!activePolicies || activePolicies.length === 0) {
      return res.status(404).json({
        message:
          "No active policy documents found. Please contact HR to upload documents.",
      });
    }

    // 3. Prepare Context
    // Combine content from all policies
    let combinedPolicyText = "";
    activePolicies.forEach((policy, index) => {
      combinedPolicyText += `\n--- Document ${index + 1}: ${
        policy.originalName
      } ---\n${policy.textContent}\n`;
    });

    // Combine Tenant Context + Policy Content
    const context = `
    Company Name: ${tenant.companyName}
    Additional Context: ${tenant.aiConfig.context || ""}
    
    Reference Documents:
    ${combinedPolicyText}
    `;

    // Generate Answer
    const answer = await aiService.generateResponse(context, question);

    res.json({ answer });
  } catch (err) {
    console.error("AI Question Error:", err);
    console.error("Error specifics:", err.message, err.stack);
    if (err.message.includes("AI Service is not initialized")) {
      return res
        .status(503)
        .json({ message: "AI Service unavailable. Check API Key." });
    }
    res
      .status(500)
      .json({ message: "Server error during AI processing: " + err.message });
  }
};

// Get current policies status
exports.getPolicyStatus = async (req, res) => {
  try {
    const activePolicies = await PolicyDocument.find({
      isActive: true,
      tenantId: req.user.tenantId,
    })
      .select("originalName createdAt updatedAt")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      hasPolicy: activePolicies.length > 0, // Keep for backward compatibility if needed, though list is better
      policies: activePolicies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a policy
exports.deletePolicy = async (req, res) => {
  try {
    const policy = await PolicyDocument.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    // Soft delete
    policy.isActive = false;
    await policy.save();

    res.json({ message: "Policy removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
