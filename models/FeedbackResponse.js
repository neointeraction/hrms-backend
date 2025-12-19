const mongoose = require("mongoose");

const feedbackResponseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      required: true,
    },
    respondent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional: if it's a peer review, who is being reviewed?
    // For now, based on requirements, it seems generic or self-reflection,
    // but the image says "Peer review for: Mr. James Smith".
    // So we need a targetUser.
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // using Employee to link to specific person profile if needed, or User
      required: false, // Optional for general surveys
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        ratingValue: {
          type: String, // "1", "2", "3", "4", "5", "NE"
          enum: ["1", "2", "3", "4", "5", "NE"],
        },
        textValue: String,
      },
    ],
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

feedbackResponseSchema.index(
  { formId: 1, respondent: 1, targetUser: 1 },
  { unique: true }
);
feedbackResponseSchema.index({ tenantId: 1 });

module.exports = mongoose.model("FeedbackResponse", feedbackResponseSchema);
