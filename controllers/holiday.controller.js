const Holiday = require("../models/Holiday");

// Get all holidays (optionally filter by year)
exports.getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const query = { tenantId };
    if (year) {
      query.year = year;
    }

    // Sort by date ascending
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching holidays", error: error.message });
  }
};

// Add a single holiday
exports.addHoliday = async (req, res) => {
  try {
    const { name, date, type, description } = req.body;

    const holidayDate = new Date(date);
    const day = holidayDate.toLocaleDateString("en-US", { weekday: "long" });
    const year = holidayDate.getFullYear();

    const holiday = new Holiday({
      tenantId: req.user.tenantId, // Add tenantId
      name,
      date: holidayDate,
      day,
      year,
      type,
      description,
    });

    await holiday.save();
    res.status(201).json(holiday);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A holiday already exists on this date." });
    }
    res
      .status(500)
      .json({ message: "Error adding holiday", error: error.message });
  }
};

// Update a holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const tenantId = req.user.tenantId; // Get tenantId from req.user

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    if (updates.date) {
      const holidayDate = new Date(updates.date);
      updates.day = holidayDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      updates.year = holidayDate.getFullYear();
    }

    const holiday = await Holiday.findByIdAndUpdate(id, updates, { new: true });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    res.json(holiday);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating holiday", error: error.message });
  }
};

// Delete a holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting holiday", error: error.message });
  }
};

// Seed 2025 Data
exports.seedHolidays = async (req, res) => {
  try {
    const holidays2025 = [
      { name: "Republic Day", date: "2025-01-26", type: "Public" },
      { name: "Holi", date: "2025-03-14", type: "Public" },
      { name: "Ramzan/Eid-Al-Fitr", date: "2025-03-31", type: "Public" },
      { name: "Good Friday", date: "2025-04-18", type: "Public" },
      { name: "Labour Day", date: "2025-05-01", type: "Public" },
      { name: "Independence Day", date: "2025-08-15", type: "Public" },
      { name: "Id-E-Milad", date: "2025-09-05", type: "Public" },
      { name: "Dusshera", date: "2025-10-01", type: "Public" },
      { name: "Gandhi Jayanthi", date: "2025-10-02", type: "Public" },
      { name: "Diwali", date: "2025-10-20", type: "Public" },
      { name: "Kannada Rajyothsava", date: "2025-11-01", type: "Public" },
      { name: "Christmas", date: "2025-12-25", type: "Public" },
    ];

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // Clear existing for 2025 for this tenant to avoid duplicates during re-seed
    await Holiday.deleteMany({ year: 2025, tenantId });

    const processed = holidays2025.map((h) => {
      const d = new Date(h.date);
      return {
        ...h,
        tenantId, // Add tenantId
        day: d.toLocaleDateString("en-US", { weekday: "long" }),
        year: 2025,
      };
    });

    await Holiday.insertMany(processed);
    res.json({
      message: "2025 Holidays seeded successfully",
      count: processed.length,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error seeding holidays", error: error.message });
  }
};
