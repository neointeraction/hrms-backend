const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String, // URL/Path to the svg/png
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Badge", badgeSchema);
