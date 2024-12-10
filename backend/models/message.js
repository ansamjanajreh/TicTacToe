let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let messageSchema = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    value: {
      type: String,
      required: true,
    },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  },
  { timestamps: true }
);
let Message = mongoose.model("Message", messageSchema, "messages");
module.exports = Message;
