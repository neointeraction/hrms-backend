const mongoose = require("mongoose");

const feedbackFormSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    questions: [
      {
        text: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["rating", "text"], // rating = 1-5 + NE, text = open ended
          default: "rating",
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    assignedTo: {
      type: String,
      enum: ["all"],
      default: "all",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

feedbackFormSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model("FeedbackForm", feedbackFormSchema);
