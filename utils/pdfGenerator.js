const PDFDocument = require("pdfkit");

/**
 * Generates an Offer Letter PDF buffer.
 * @param {Object} employee - { firstName, lastName, role, address }
 * @param {Object} details - { salary, joiningDate, designation }
 * @param {Object} company - { name, address, logoUrl }
 * @returns {Promise<Buffer>}
 */
exports.generateOfferLetter = async (employee, details, company) => {
  let logoBuffer = null;
  let logoPath = null;

  // 1. Pre-fetch Logo if it's a URL
  if (company.logo && company.logo.startsWith("http")) {
    try {
      const axios = require("axios");
      const response = await axios.get(company.logo, {
        responseType: "arraybuffer",
      });
      logoBuffer = Buffer.from(response.data);
    } catch (e) {
      console.error("Failed to download logo for PDF:", e.message);
    }
  } else if (company.logo) {
    // Handle local path
    const path = require("path");
    const fs = require("fs");
    let localPath = company.logo;
    if (!path.isAbsolute(localPath)) {
      localPath = path.join(process.cwd(), localPath);
    }
    if (fs.existsSync(localPath)) {
      logoPath = localPath;
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // --- Logo & Header ---
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, {
            fit: [100, 50],
            align: "center",
          });
          doc.moveDown();
        } catch (e) {
          console.error("Error embedding logo buffer:", e);
        }
      } else if (logoPath) {
        try {
          doc.image(logoPath, {
            fit: [100, 50],
            align: "center",
          });
          doc.moveDown();
        } catch (e) {
          console.error("Error embedding logo path:", e);
        }
      }

      if (company.name) {
        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(company.name, { align: "center" });
      }

      doc.moveDown();
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(new Date().toDateString(), { align: "right" });

      doc.moveDown(2);

      // --- Recipient ---
      doc.fontSize(12).font("Helvetica-Bold").text("To,");
      doc
        .font("Helvetica")
        .text(`${employee.firstName} ${employee.lastName}`)
        .text(details.address || "Candidate Address") // Fallback if no address
        .moveDown();

      // --- Subject ---
      doc
        .font("Helvetica-Bold")
        .text(
          `Subject: Offer of Employment - ${
            details.designation || employee.role
          }`,
          {
            align: "center",
            underline: true,
          }
        );

      doc.moveDown();

      // --- Body ---
      doc
        .font("Helvetica")
        .text(`Dear ${employee.firstName},`, { align: "left" });
      doc.moveDown();

      doc.text(
        `We are pleased to offer you the position of ${
          details.designation || employee.role
        } at ${
          company.name || "Our Company"
        }. We were impressed with your qualifications and believe you will be a valuable asset to our team.`
      );
      doc.moveDown();

      doc.text(
        `Your starting date will be ${new Date(
          details.joiningDate
        ).toDateString()}.`
      );
      doc.moveDown();

      doc.text(
        `Your annual Cost to Company (CTC) will be ${
          details.salary ? details.salary.toLocaleString() : "TBD"
        }.`
      );
      doc.moveDown();

      doc.text(
        "We look forward to welcoming you to the team. Please sign and return the duplicate copy of this letter as a token of your acceptance."
      );
      doc.moveDown(2);

      // --- Signatures ---
      doc.text("Sincerely,");
      doc.moveDown(3);
      doc.text("HR Manager");
      doc.text(company.name || "Company Name");

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
