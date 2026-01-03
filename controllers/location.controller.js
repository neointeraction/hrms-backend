const mongoose = require("mongoose");
const Location = require("../models/Location");

// Create Location
exports.createLocation = async (req, res) => {
  try {
    const { name, address, city, country, isHeadquarters } = req.body;

    // Check if location with same name exists for this tenant
    const existingLocation = await Location.findOne({
      tenantId: req.user.tenantId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingLocation) {
      return res
        .status(400)
        .json({ message: "Location with this name already exists" });
    }

    const location = new Location({
      name,
      address,
      city,
      country,
      isHeadquarters: isHeadquarters || false,
      tenantId: req.user.tenantId,
    });

    await location.save();
    res.status(201).json(location);
  } catch (error) {
    console.error("Create location error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Location Stats
exports.getLocationStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const totalLocations = await Location.countDocuments({ tenantId });
    const activeLocations = await Location.countDocuments({
      tenantId,
      status: "Active",
    });
    const inactiveLocations = totalLocations - activeLocations;

    // Get employee distribution by location
    // We aggregate on Employee collection, grouping by the 'location' string field
    const Employee = require("../models/Employee");

    // Note: Employee model stores location as a String (name), not an ID reference in the current schema version provided.
    const employeeDistribution = await Employee.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      {
        $group: {
          _id: "$location", // Group by location name
          count: { $sum: 1 },
        },
      },
    ]);

    const locationCounts = {};
    employeeDistribution.forEach((item) => {
      // _id is the location name (string) or null if not set
      if (item._id) {
        locationCounts[item._id] = item.count;
      }
    });

    res.json({
      total: totalLocations,
      active: activeLocations,
      inactive: inactiveLocations,
      locationCounts,
    });
  } catch (error) {
    console.error("Get location stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Locations
exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find({ tenantId: req.user.tenantId }).sort(
      {
        createdAt: -1,
      }
    );
    res.json(locations);
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Location
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, status, isHeadquarters } = req.body;

    const location = await Location.findOne({
      _id: id,
      tenantId: req.user.tenantId,
    });

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // specific check if name is being updated to ensure uniqueness
    if (name && name !== location.name) {
      const existing = await Location.findOne({
        tenantId: req.user.tenantId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "Location with this name already exists" });
      }
      location.name = name;
    }

    if (address !== undefined) location.address = address;
    if (city !== undefined) location.city = city;
    if (country !== undefined) location.country = country;
    if (status !== undefined) location.status = status;
    if (isHeadquarters !== undefined) location.isHeadquarters = isHeadquarters;

    await location.save();
    res.json(location);
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Location
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findOneAndDelete({
      _id: id,
      tenantId: req.user.tenantId,
    });

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Delete location error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
