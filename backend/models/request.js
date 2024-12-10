let mongoose = require("mongoose");
const Group = require("./group");
const User = require("./user");
let Schema = mongoose.Schema;

let requestSchema = new Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    immutable: true,
  },
});

let Request = new mongoose.model("Request", requestSchema, "requests");

module.exports = Request;
