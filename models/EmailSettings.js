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
    timesheetReminder: {
      enabled: { type: Boolean, default: false },
      subject: {
        type: String,
        default: "Reminder: Update Your Timesheet",
      },
      body: {
        type: String,
        default:
          "Dear {{employee_name}},\n\nThis is a friendly reminder to update your timesheet for the current week.\n\nPlease log your hours at your earliest convenience.\n\nBest regards,\n{{company_name}}",
      },
      dayOfWeek: { type: Number, default: 5, min: 0, max: 6 }, // 0=Sunday, 6=Saturday, default Friday
      time: { type: String, default: "09:00" }, // 24-hour format HH:mm
    },
    holidayReminder: {
      enabled: { type: Boolean, default: false },
      subject: {
        type: String,
        default: "Upcoming Holiday: {{holiday_name}}",
      },
      body: {
        type: String,
        default:
          "Dear Team,\n\nThis is a reminder that our office will be closed on {{holiday_date}} ({{holiday_day}}) for {{holiday_name}}.\n\nEnjoy the break!\n\nBest regards,\n{{company_name}}",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailSettings", EmailSettingsSchema);
