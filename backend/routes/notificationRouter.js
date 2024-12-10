const { protect } = require("../middleware/authMiddleware");
let express = require("express");
let asyncHandler = require("express-async-handler");
const Message = require("../models/message");
const { hash_key } = require("../serverConstants.js");
let CryptoJS = require("crypto-js");
const Notification = require("../models/notification");
let notificationRouter = express.Router();

notificationRouter.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { messageId } = req.body;
      const message = await Message.findById(messageId).populate("sender");
      const newNotification = {
        user: req.currentUser._id,
        message: message._id,
      };
      await Notification.create(newNotification);
      let bytes = CryptoJS.AES.decrypt(message["value"], hash_key);
      let originalText = bytes.toString(CryptoJS.enc.Utf8);
      message["value"] = originalText;
      res.status(200).json({ user: req.currentUser, message });
    } catch (err) {
      console.log(err.message);
    }
  })
);

notificationRouter.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const userNotifications = await Notification.find({
        user: req.currentUser._id,
      })
        .populate("message")
        .populate({
          path: "message",
          populate: {
            path: "sender",
            model: "User",
          },
        })
        .sort({ updatedAt: -1 });
      userNotifications.forEach((notification) => {
        // Decrypt
        let bytes = CryptoJS.AES.decrypt(
          notification["message"]["value"],
          hash_key
        );
        let originalText = bytes.toString(CryptoJS.enc.Utf8);
        notification["message"]["value"] = originalText;
      });
      res.status(200).json(userNotifications);
    } catch (err) {
      console.log(err.message);
    }
  })
);

notificationRouter.delete(
  "/:notificationMessageId",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { notificationMessageId } = req.params;
      const message = await Message.findById(notificationMessageId);
      await Notification.deleteOne({ message: notificationMessageId });
      res.status(200).json(message);
    } catch (err) {
      console.log(err.message);
    }
  })
);
module.exports = notificationRouter;
