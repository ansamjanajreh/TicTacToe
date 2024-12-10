let mongoose = require("mongoose");
const Group = require("./group");
const User = require("./user");
let Schema = mongoose.Schema;

let InvitationSchema = new Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    immutable: true,
  },
});

let Invitation = new mongoose.model(
  "Invitation",
  InvitationSchema,
  "Invitations"
);

module.exports = Invitation;
