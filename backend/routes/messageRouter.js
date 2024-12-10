let express = require("express");
let asyncHandler = require("express-async-handler");
let CryptoJS = require("crypto-js");
const Chat = require("../models/chat");
const Message = require("../models/message");
const User = require("../models/user");
const { protect } = require("../middleware/authMiddleware");
const { hash_key } = require("../serverConstants.js");
let messageRouter = express.Router();

messageRouter.get(
  "/:userName",
  protect,
  asyncHandler(async (req, res) => {
    const { userName } = req.params;
    const otherUser = await User.findOne({ userName });
    const existChat = await Chat.findOne({
      $and: [
        { users: { $elemMatch: { $eq: req.currentUser._id } } },
        { users: { $elemMatch: { $eq: otherUser._id } } },
      ],
    });
    if (!existChat) {
      res.status(400);
      throw new Error("chat not found");
    }
    let messages = await Message.find({ chat: existChat._id }).populate(
      "sender"
    );
    messages.forEach((message) => {
      // Decrypt
      let bytes = CryptoJS.AES.decrypt(message["value"], hash_key);
      let originalText = bytes.toString(CryptoJS.enc.Utf8);
      message["value"] = originalText;
    });
    res.status(200).json(messages);
  })
);

messageRouter.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    let { value, chatId } = req.body;

    if (!value || !chatId) {
      res.status(400);
      throw new Error("Invalid data passed");
    }
    try {
      const val = value;
      value = CryptoJS.AES.encrypt(value, hash_key).toString();
      let newMessage = {
        sender: req.currentUser._id,
        value,
        chat: chatId,
      };

      let message = await Message.create(newMessage);
      message = await message.populate("sender");
      message = await message.populate("chat");
      message = await User.populate(message, {
        path: "chat.users",
      });
      await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
      message["value"] = val;
      res.status(200).json(message);
    } catch (e) {
      console.log(e);
    }
  })
);

module.exports = messageRouter;
