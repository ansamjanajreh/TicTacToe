const mongoose = require("mongoose");

const notificationModel = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

const Notification = mongoose.model(
  "Notification",
  notificationModel,
  "notifications"
);

module.exports = Notification;
