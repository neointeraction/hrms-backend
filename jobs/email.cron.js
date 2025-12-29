const cron = require("node-cron");
const Employee = require("../models/Employee");
const EmailSettings = require("../models/EmailSettings");
const EmailAudit = require("../models/EmailAudit");
const emailService = require("../services/email.service");

// Utility to populate template placeholders
const populateTemplate = (template, employee, yearsCompleted, companyName) => {
  let body = template
    .replace(/{{employee_name}}/g, `${employee.firstName} ${employee.lastName}`)
    .replace(/{{years_completed}}/g, yearsCompleted)
    .replace(/{{company_name}}/g, companyName)
    .replace(/{{hr_name}}/g, "HR Team"); // Default fallback or fetch from settings? Using generic for now.
  return body;
};

const processEmailAutomation = async (tenantId = null) => {
  console.log("Starting Email Automation Job...");
  try {
    // 1. Fetch settings (active tenants only ideally, but settings implies active)
    const query = tenantId ? { tenantId } : {};
    const allSettings = await EmailSettings.find(query).populate("tenantId");

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    for (const settings of allSettings) {
      if (!settings.schedule.enabled && !tenantId) continue; // Skip if disabled globally (unless manual trigger)

      const tenant = settings.tenantId; // The user doc representing tenant/admin
      if (!tenant) continue;

      const companyName = tenant.companyName || "Our Company";

      // --- Birthday Logic ---
      if (settings.birthday.enabled) {
        const birthdayEmployees = await Employee.find({
          tenantId: settings.tenantId._id,
          employeeStatus: "Active",
          $expr: {
            $and: [
              { $eq: [{ $month: "$dateOfBirth" }, currentMonth] },
              { $eq: [{ $dayOfMonth: "$dateOfBirth" }, currentDay] },
            ],
          },
        });

        for (const emp of birthdayEmployees) {
          // Check if already sent today to avoid dupes on manual run?
          // Simple check: see audit log for today.
          const startOfDay = new Date(today.setHours(0, 0, 0, 0));
          const endOfDay = new Date(today.setHours(23, 59, 59, 999));

          const alreadySent = await EmailAudit.findOne({
            "recipient.employeeId": emp._id,
            type: "Birthday",
            sentAt: { $gte: startOfDay, $lte: endOfDay },
            status: "Success",
          });

          if (alreadySent && !tenantId) continue; // Skip if auto-run and already sent. Allow manual re-send? Maybe.

          const subject = settings.birthday.subject.replace(
            /{{employee_name}}/g,
            emp.firstName
          );
          const body = populateTemplate(
            settings.birthday.body,
            emp,
            0,
            companyName
          );

          // Send Email (body is already HTML)
          const result = await emailService.sendEmail({
            to: emp.email,
            subject: subject,
            html: body,
          });

          // Log Audit
          await EmailAudit.create({
            tenantId: settings.tenantId._id,
            recipient: {
              name: `${emp.firstName} ${emp.lastName}`,
              email: emp.email,
              employeeId: emp._id,
            },
            type: "Birthday",
            subject: subject,
            bodySnapshot: body,
            status: result.success ? "Success" : "Failed",
            error: result.error,
            triggeredBy: tenantId ? "HR Manual" : "System",
          });

          // If notifyAllEmployees is enabled, send celebration email to all other employees
          if (settings.notification?.notifyAllEmployees) {
            const allEmployees = await Employee.find({
              tenantId: settings.tenantId._id,
              employeeStatus: "Active",
              _id: { $ne: emp._id }, // Exclude the birthday person
              email: { $exists: true, $ne: null, $ne: "" },
            });

            const celebrationSubject = `🎉 ${emp.firstName} ${emp.lastName}'s Birthday!`;
            const celebrationBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Birthday Celebration! 🎉</h1>
  </div>
  <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Today we're celebrating <strong style="color: #667eea;">${emp.firstName} ${emp.lastName}</strong>'s birthday! 🎂
    </p>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Let's join together in wishing them a wonderful day filled with joy and happiness!
    </p>
    <p style="color: #999999; font-size: 14px; margin-top: 30px;">
      Best wishes,<br>
      <strong style="color: #667eea;">The ${companyName} Team</strong>
    </p>
  </div>
</div>`;

            for (const employee of allEmployees) {
              await emailService.sendEmail({
                to: employee.email,
                subject: celebrationSubject,
                html: celebrationBody,
              });
            }

            console.log(
              `Sent birthday celebration emails to ${allEmployees.length} employees`
            );
          }
        }
      }

      // --- Anniversary Logic ---
      if (settings.anniversary.enabled) {
        // Work Anniversary matches Month and Day of Joining
        const anniversaryEmployees = await Employee.find({
          tenantId: settings.tenantId._id,
          employeeStatus: "Active",
          $expr: {
            $and: [
              { $eq: [{ $month: "$dateOfJoining" }, currentMonth] },
              { $eq: [{ $dayOfMonth: "$dateOfJoining" }, currentDay] },
              // Ensure we don't celebrate joining year (0 years)
              { $lt: [{ $year: "$dateOfJoining" }, currentYear] },
            ],
          },
        });

        for (const emp of anniversaryEmployees) {
          const joinYear = new Date(emp.dateOfJoining).getFullYear();
          const yearsCompleted = currentYear - joinYear;

          if (yearsCompleted <= 0) continue;

          const startOfDay = new Date(today.setHours(0, 0, 0, 0));
          const endOfDay = new Date(today.setHours(23, 59, 59, 999));

          const alreadySent = await EmailAudit.findOne({
            "recipient.employeeId": emp._id,
            type: "Anniversary",
            sentAt: { $gte: startOfDay, $lte: endOfDay },
            status: "Success",
          });

          if (alreadySent && !tenantId) continue;

          const subject = settings.anniversary.subject.replace(
            /{{employee_name}}/g,
            emp.firstName
          );
          const body = populateTemplate(
            settings.anniversary.body,
            emp,
            yearsCompleted,
            companyName
          );

          // Send Email (body is already HTML)
          const result = await emailService.sendEmail({
            to: emp.email,
            subject: subject,
            html: body,
          });

          await EmailAudit.create({
            tenantId: settings.tenantId._id,
            recipient: {
              name: `${emp.firstName} ${emp.lastName}`,
              email: emp.email,
              employeeId: emp._id,
            },
            type: "Anniversary",
            subject: subject,
            bodySnapshot: body,
            status: result.success ? "Success" : "Failed",
            error: result.error,
            triggeredBy: tenantId ? "HR Manual" : "System",
          });

          // If notifyAllEmployees is enabled, send celebration email to all other employees
          if (settings.notification?.notifyAllEmployees) {
            const allEmployees = await Employee.find({
              tenantId: settings.tenantId._id,
              employeeStatus: "Active",
              _id: { $ne: emp._id }, // Exclude the anniversary person
              email: { $exists: true, $ne: null, $ne: "" },
            });

            const celebrationSubject = `🎊 ${emp.firstName} ${emp.lastName}'s ${yearsCompleted} Year Work Anniversary!`;
            const celebrationBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎊 Work Anniversary Celebration! 🎊</h1>
  </div>
  <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Today we're celebrating <strong style="color: #f5576c;">${emp.firstName} ${emp.lastName}</strong> for completing <strong>${yearsCompleted} years</strong> with ${companyName}! 🎉
    </p>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Let's join together in congratulating them on this remarkable milestone and thanking them for their dedication and contributions!
    </p>
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0;">${yearsCompleted}</p>
      <p style="color: #ffffff; font-size: 16px; margin: 5px 0 0 0;">Years</p>
    </div>
    <p style="color: #999999; font-size: 14px; margin-top: 30px;">
      Best wishes,<br>
      <strong style="color: #667eea;">The ${companyName} Team</strong>
    </p>
  </div>
</div>`;

            for (const employee of allEmployees) {
              await emailService.sendEmail({
                to: employee.email,
                subject: celebrationSubject,
                html: celebrationBody,
              });
            }

            console.log(
              `Sent anniversary celebration emails to ${allEmployees.length} employees`
            );
          }
        }
      }

      // --- Timesheet Reminder Logic ---
      if (settings.timesheetReminder?.enabled) {
        const Timesheet = require("../models/Timesheet");

        // Calculate current week ending date (Sunday)
        const dayOfWeek = today.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const currentWeekEnding = new Date(today);
        currentWeekEnding.setDate(today.getDate() + daysUntilSunday);
        currentWeekEnding.setHours(0, 0, 0, 0);

        // Get all active employees for this tenant
        const allActiveEmployees = await Employee.find({
          tenantId: settings.tenantId._id,
          employeeStatus: "Active",
          email: { $exists: true, $ne: null, $ne: "" },
        });

        for (const emp of allActiveEmployees) {
          // Check if employee has any timesheet entries for current week
          const timesheetEntries = await Timesheet.find({
            employee: emp._id,
            weekEnding: currentWeekEnding,
          });

          // If no entries or all entries are in draft status, send reminder
          if (
            timesheetEntries.length === 0 ||
            timesheetEntries.every((t) => t.status === "draft")
          ) {
            // Check if already sent reminder today to avoid dupes
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const alreadySent = await EmailAudit.findOne({
              "recipient.employeeId": emp._id,
              type: "TimesheetReminder",
              sentAt: { $gte: startOfDay, $lte: endOfDay },
              status: "Success",
            });

            if (alreadySent && !tenantId) continue; // Skip if auto-run and already sent

            const subject = settings.timesheetReminder.subject.replace(
              /{{employee_name}}/g,
              emp.firstName
            );
            const body = populateTemplate(
              settings.timesheetReminder.body,
              emp,
              0,
              companyName
            );

            // Send Email
            const result = await emailService.sendEmail({
              to: emp.email,
              subject: subject,
              html: body,
            });

            // Log Audit
            await EmailAudit.create({
              tenantId: settings.tenantId._id,
              recipient: {
                name: `${emp.firstName} ${emp.lastName}`,
                email: emp.email,
                employeeId: emp._id,
              },
              type: "TimesheetReminder",
              subject: subject,
              bodySnapshot: body,
              status: result.success ? "Success" : "Failed",
              error: result.error,
              triggeredBy: tenantId ? "HR Manual" : "System",
            });

            console.log(
              `Sent timesheet reminder to ${emp.firstName} ${emp.lastName}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Email Automation Job Failed:", error);
  }
};

const initCron = () => {
  // Schedule to run daily at 9:00 AM server time (or configurable?)
  // Requirement says "Option to send emails automatically at 9 AM".
  // We'll stick to 9 AM default for simplicity across tenants or parse from config (complex if per-tenant time differs).
  // Given the prompt implies per-tenant config, we might need to run every hour and check 'schedule.time'.
  // For MVP/Demo: Run every hour 00 minutes, check settings matching current hour?
  // OR simpler: Requirement says "A daily scheduled job should run at the configured time."
  // Let's run at 9 AM strictly for now as per "Option to send ... at 9 AM".
  // Or run every hour and match the settings.time.

  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentDayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday

    // Fetch all settings with birthday/anniversary enabled
    const allSettings = await EmailSettings.find({ "schedule.enabled": true });
    for (const settings of allSettings) {
      const [h, m] = (settings.schedule.time || "09:00").split(":");
      if (parseInt(h) === now.getHours()) {
        console.log(
          `Triggering birthday/anniversary automation for tenant ${settings.tenantId} at ${h}:${m}`
        );
        await processEmailAutomation(settings.tenantId);
      }
    }

    // Fetch all settings with timesheet reminders enabled
    const timesheetSettings = await EmailSettings.find({
      "timesheetReminder.enabled": true,
    });
    for (const settings of timesheetSettings) {
      const [h, m] = (settings.timesheetReminder.time || "09:00").split(":");
      const configuredDay = settings.timesheetReminder.dayOfWeek || 5; // Default Friday

      // Check if current day and hour match the configured schedule
      if (
        parseInt(h) === now.getHours() &&
        currentDayOfWeek === configuredDay
      ) {
        console.log(
          `Triggering timesheet reminder for tenant ${settings.tenantId} at ${h}:${m} on day ${configuredDay}`
        );
        await processEmailAutomation(settings.tenantId);
      }
    }
  });

  console.log("Email Automation Cron Initialized (Running Hourly Check)");
};

module.exports = { initCron, processEmailAutomation };
