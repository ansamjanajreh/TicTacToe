const { protect } = require("../middleware/authMiddleware");
const User = require("../models/user");
const Chat = require("../models/chat");
let express = require("express");
let asyncHandler = require("express-async-handler");
let CryptoJS = require("crypto-js");
const { hash_key } = require("../serverConstants.js");

let chatRouter = express.Router();
// create new chat between two user
//or return chat information if the chat exist
chatRouter.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { userName } = req.body;
      const otherUser = await User.findOne({ userName });
      let existChat = await Chat.findOne({
        $and: [
          { users: { $elemMatch: { $eq: req.currentUser._id } } },
          { users: { $elemMatch: { $eq: otherUser._id } } },
        ],
      })
        .populate("latestMessage")
        .populate("users");
      existChat = await User.populate(existChat, {
        path: "latestMessage.sender",
      });
      if (existChat) {
        if (existChat["latestMessage"]) {
          var bytes = CryptoJS.AES.decrypt(
            existChat["latestMessage"]["value"],
            hash_key
          );
          var originalText = bytes.toString(CryptoJS.enc.Utf8);
          existChat["latestMessage"]["value"] = originalText;
        }
        res.status(200).send(existChat);
      } else {
        //console.log(otherUser._id);
        const chatData = {
          users: [req.currentUser._id, otherUser._id],
        };
        const createdChat = await Chat.create(chatData);
        const FullChat = await Chat.findById(createdChat._id).populate("users");
        res.status(200).json(FullChat);
      }
    } catch (e) {
      console.log(e.message);
    }
  })
);

//fetch all chats for the user
chatRouter.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      Chat.find({
        users: { $elemMatch: { $eq: req.currentUser._id } },
      })
        .populate("users")
        .populate("latestMessage")
        .sort({ updatedAt: 1 })
        .then(async (results) => {
          results = await User.populate(results, {
            path: "latestMessage.sender",
          });

          results.forEach((chat) => {
            if (chat["latestMessage"]) {
              // Decrypt
              let bytes = CryptoJS.AES.decrypt(
                chat["latestMessage"]["value"],
                hash_key
              );
              let originalText = bytes.toString(CryptoJS.enc.Utf8);
              chat["latestMessage"]["value"] = originalText;
            }
          });
          // console.log(results);
          res.status(200).send(results);
        });
    } catch (error) {
      res.status(401);
      throw new Error(error.message);
    }
  })
);

chatRouter.get(
  "/contact/:keyword",
  protect,
  asyncHandler(async (req, res) => {
    const { keyword } = req.params;
    const users = await User.find({
      userName: {
        $regex: keyword,
        $options: "i",
      },
    });
    res.status(200).json(users);
  })
);
module.exports = chatRouter;
