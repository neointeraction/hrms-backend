const nodemailer = require("nodemailer");

// Simple transporter setup.
// In a real app, these credentials would come from ENV vars or the Settings DB.
// For now, using a mock or generic placeholder that relies on ENV.
// User didn't specify credentials, so we'll assume they are set in .env
// or use a test account for development if not provided.

// Check if credentials are set
const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter;
if (hasCredentials) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  console.log("WARN: No EMAIL_USER/PASS set. Using MOCK email sender.");
}

exports.sendEmail = async ({ to, cc, subject, html, attachments = [] }) => {
  try {
    if (!to) {
      throw new Error("No recipient defined");
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"HR System" <no-reply@hrms.com>',
      to,
      cc,
      subject,
      html, // using html for rich text support
      attachments, // Array of { filename, content }
    };

    // Fix: The arguments might be passed as an object.
    // Let's rely on the destructured params in the function signature.
    // We need to update the signature to include attachments.

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent: %s", info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      // Mock Send
      console.log("---------------------------------------------------");
      console.log("[MOCK EMAIL] To:", to);
      console.log("[MOCK EMAIL] CC:", cc);
      console.log("[MOCK EMAIL] Subject:", subject);
      console.log("[MOCK EMAIL] Size:", html.length);
      console.log(
        "[MOCK EMAIL] Attachments:",
        attachments ? attachments.length : 0
      );
      console.log("---------------------------------------------------");
      return { success: true, messageId: "mock-" + Date.now() };
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};
