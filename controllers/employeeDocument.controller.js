const EmployeeDocument = require("../models/EmployeeDocument");
const DocumentType = require("../models/DocumentType");
// const path = require("path");

// Upload a document (handles both new and version updates)
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { employeeId, documentTypeId, expiryDate, notes } = req.body;
    const { tenantId, userId } = req.user;

    // Verify DocumentType exists
    const docType = await DocumentType.findOne({
      _id: documentTypeId,
      tenantId,
    });
    if (!docType) {
      return res.status(404).json({
        success: false,
        message: "Document Type not found",
      });
    }

    // Check file size limit from DocumentType (if not handled by multer)
    if (req.file.size > docType.maxFileSize) {
      // Note: Multer might have uploaded it already, but we can reject metadata saving.
      // Ideally multer limits should be dynamic, but difficult.
      // We'll trust client/multer for now or handle cleanup if needed.
    }

    // Check if document entry exists for this employee and type
    let empDoc = await EmployeeDocument.findOne({
      tenantId,
      employeeId,
      documentTypeId,
    });

    const newVersion = {
      versionNumber: empDoc ? empDoc.currentVersion + 1 : 1,
      fileUrl: req.file.path.replace(/\\/g, "/"), // Force forward slashes for URL compatibility
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes,
    };

    if (empDoc) {
      // Overwrite versions (No History Feature)
      // We keep the versions array structure but it will only ever have 1 item.
      // Increment version number just to show updates happened, or reset to 1?
      // Let's increment currentVersion for cache busting but clear the list.
      const nextVersionNum = empDoc.currentVersion + 1;
      newVersion.versionNumber = nextVersionNum;

      empDoc.versions = [newVersion]; // Replace entire array
      empDoc.currentVersion = nextVersionNum;

      // Update status if expiry logic requires it (e.g. valid now)
      empDoc.status = "Valid";

      await empDoc.save();
    } else {
      // Create new document entry
      empDoc = new EmployeeDocument({
        employeeId,
        documentTypeId,
        tenantId,
        versions: [newVersion],
        currentVersion: 1,
        status: "Valid",
      });
      await empDoc.save();
    }

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: empDoc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all documents for an employee
exports.getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { tenantId } = req.user;

    // Return documents populated with DocumentType info
    const documents = await EmployeeDocument.find({ tenantId, employeeId })
      .populate("documentTypeId", "name category isRequired expiryRequired")
      .populate("versions.uploadedBy", "name")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a specific document Details
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const document = await EmployeeDocument.findOne({ _id: id, tenantId })
      .populate("documentTypeId", "name category")
      .populate("versions.uploadedBy", "name");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Restore a previous version (revert current version)
exports.restoreVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    // Just logic to set currentVersion? Or copy old version as new version?
    // "New version is added" -> Copy old version data as new version (v_new = v_current + 1)

    // For now, let's just create a new version entry that duplicates the old one
    // to preserve history linearity.

    // Simplification for prototype: Client can just re-upload if they have the file,
    // OR we can Implement this later.
    // Let's implement simple "Mark as Current" logic or "Promote".

    // Implementation: Copy version payload to new version
    const { tenantId, userId } = req.user;

    const empDoc = await EmployeeDocument.findOne({ _id: id, tenantId });
    if (!empDoc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const targetVersion = empDoc.versions.find(
      (v) => v.versionNumber === parseInt(versionNumber)
    );
    if (!targetVersion) {
      return res.status(404).json({
        success: false,
        message: "Version not found",
      });
    }

    const newVersion = {
      versionNumber: empDoc.currentVersion + 1,
      fileUrl: targetVersion.fileUrl,
      fileName: targetVersion.fileName,
      fileSize: targetVersion.fileSize,
      mimeType: targetVersion.mimeType,
      uploadedBy: userId,
      uploadedAt: new Date(),
      expiryDate: targetVersion.expiryDate,
      notes: `Restored from version ${targetVersion.versionNumber}`,
    };

    empDoc.versions.push(newVersion);
    empDoc.currentVersion = newVersion.versionNumber;
    await empDoc.save();

    res.status(200).json({
      success: true,
      data: empDoc,
      message: `Restored version ${versionNumber} as v${newVersion.versionNumber}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
