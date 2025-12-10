const PolicyDocument = require("../models/PolicyDocument");
const aiService = require("../utils/ai.service");
const fs = require("fs");
const pdf = require("pdf-parse");

// Upload and Parse Policy Document
exports.uploadPolicy = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read file buffer
    const dataBuffer = fs.readFileSync(req.file.path);

    // Parse PDF
    let textContent = "";
    try {
      const data = await pdf(dataBuffer);
      textContent = data.text;
    } catch (parseError) {
      console.error("PDF Parse Error:", parseError);
      return res.status(400).json({ message: "Failed to parse PDF document" });
    }

    if (!textContent || textContent.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Extracted text is empty. Please check the PDF." });
    }

    // Deactivate previous active policies
    await PolicyDocument.updateMany({ isActive: true }, { isActive: false });

    // Save new policy
    const newPolicy = new PolicyDocument({
      filename: req.file.path,
      originalName: req.file.originalname,
      textContent: textContent,
      uploadedBy: req.user.userId,
      isActive: true,
    });

    await newPolicy.save();

    res.status(201).json({
      message: "Policy uploaded and processed successfully",
      policy: {
        id: newPolicy._id,
        filename: newPolicy.originalName,
        uploadedAt: newPolicy.createdAt,
      },
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

    // Get active policy
    const activePolicy = await PolicyDocument.findOne({ isActive: true });

    if (!activePolicy) {
      return res.status(404).json({
        message:
          "No active policy document found. Please contact HR to upload one.",
      });
    }

    // Generate Answer
    const answer = await aiService.generateResponse(
      activePolicy.textContent,
      question
    );

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

// Get current policy status
exports.getPolicyStatus = async (req, res) => {
  try {
    const activePolicy = await PolicyDocument.findOne({ isActive: true })
      .select("originalName createdAt updatedAt")
      .populate("uploadedBy", "name");

    if (!activePolicy) {
      return res.json({ hasPolicy: false });
    }

    res.json({
      hasPolicy: true,
      policy: activePolicy,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
