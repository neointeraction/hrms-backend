const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    day: {
      type: String, // e.g., "Monday", "Sunday"
    },
    year: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["Public", "Optional", "Weekend"],
      default: "Public",
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

// Prevent duplicate holidays on the same date
holidaySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);
