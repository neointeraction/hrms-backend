const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "text",
        "image",
        "poll",
        "appreciation",
        "announcement",
        "event",
        "milestone",
      ],
      default: "text",
    },
    scope: {
      type: String,
      enum: ["company", "department", "project"],
      default: "company",
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      // Ref can be generic, will be handled by business logic
    },
    content: {
      type: String,
      trim: true,
    },
    media: [
      {
        type: String, // URL
      },
    ],
    pollData: {
      question: String,
      options: [
        {
          text: String,
          votes: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Employee",
            },
          ],
        },
      ],
      allowMultiple: {
        type: Boolean,
        default: false,
      },
      expiresAt: Date,
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        type: {
          type: String,
          enum: ["like", "celebrate", "support", "insightful", "laugh"],
          default: "like",
        },
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    relatedAppreciationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appreciation",
    },
  },
  { timestamps: true }
);

// Indexes for feed performance
postSchema.index({ tenantId: 1, createdAt: -1 });
postSchema.index({ type: 1 });

module.exports = mongoose.model("Post", postSchema);
