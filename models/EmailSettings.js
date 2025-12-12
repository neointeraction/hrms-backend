const mongoose = require("mongoose");

const EmailSettingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true, // One settings doc per tenant
    },
    birthday: {
      enabled: { type: Boolean, default: false },
      subject: {
        type: String,
        default: "Happy Birthday, {{employee_name}}! 🎉",
      },
      body: {
        type: String,
        default:
          "Dear {{employee_name}},\n\nWishing you a wonderful birthday filled with joy and success.\n\nWarm regards,\n{{company_name}}",
      },
    },
    anniversary: {
      enabled: { type: Boolean, default: false },
      subject: {
        type: String,
        default: "Happy Work Anniversary, {{employee_name}}!",
      },
      body: {
        type: String,
        default:
          "Dear {{employee_name}},\n\nCongratulations on completing {{years_completed}} years with us.\nThank you for your dedication and hard work.\n\nWarm regards,\n{{company_name}}",
      },
    },
    schedule: {
      enabled: { type: Boolean, default: false }, // Overall master switch
      time: { type: String, default: "09:00" }, // 24-hour format HH:mm
    },
    notification: {
      ccManager: { type: Boolean, default: false },
      notifyHR: { type: Boolean, default: false },
      notifyAllEmployees: { type: Boolean, default: false }, // Send celebration email to all employees
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailSettings", EmailSettingsSchema);
