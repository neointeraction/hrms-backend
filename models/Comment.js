const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // For threaded comments
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        type: {
          type: String,
          enum: ["like", "love", "laugh", "insightful", "celebrate"],
          default: "like",
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
