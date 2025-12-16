const DocumentType = require("../models/DocumentType");

// Create a new document type
exports.createDocumentType = async (req, res) => {
  try {
    const {
      name,
      category,
      isRequired,
      expiryRequired,
      allowedFileTypes,
      maxFileSize,
      description,
    } = req.body;
    const { tenantId, userId } = req.user;

    const newDocType = new DocumentType({
      name,
      category,
      isRequired,
      expiryRequired,
      allowedFileTypes,
      maxFileSize,
      description,
      tenantId,
      createdBy: userId,
    });

    await newDocType.save();

    res.status(201).json({
      success: true,
      data: newDocType,
      message: "Document type created successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A document type with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all document types for a tenant
exports.getAllDocumentTypes = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const docTypes = await DocumentType.find({ tenantId, isActive: true }).sort(
      { category: 1, name: 1 }
    );

    res.status(200).json({
      success: true,
      count: docTypes.length,
      data: docTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single document type
exports.getDocumentTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const docType = await DocumentType.findOne({ _id: id, tenantId });

    if (!docType) {
      return res.status(404).json({
        success: false,
        message: "Document type not found",
      });
    }

    res.status(200).json({
      success: true,
      data: docType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a document type
exports.updateDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const updates = req.body;

    const docType = await DocumentType.findOneAndUpdate(
      { _id: id, tenantId },
      updates,
      { new: true, runValidators: true }
    );

    if (!docType) {
      return res.status(404).json({
        success: false,
        message: "Document type not found",
      });
    }

    res.status(200).json({
      success: true,
      data: docType,
      message: "Document type updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete (Archive) a document type
exports.deleteDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    // Use soft delete (set isActive to false)
    const docType = await DocumentType.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!docType) {
      return res.status(404).json({
        success: false,
        message: "Document type not found",
      });
    }

    res.status(200).json({
      success: true,
      data: docType,
      message: "Document type deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
