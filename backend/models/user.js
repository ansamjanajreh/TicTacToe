let mongoose = require("mongoose");
const level = require("./level");
let invitation = require("./invitation");
let Schema = mongoose.Schema;

let userSchema = new Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  handle: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level",
  },
  createdAt: {
    type: Date,
    immutable: true,
    default: Date.now(),
  },
  UpdatedAt: {
    type: Date,
    default: Date.now(),
  },
  role: {
    type: String,
    default: "normal",
  },
  invitations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
    },
  ],
});

userSchema.pre("save", function (next) {
  this.UpdatedAt = Date.now();
  next();
});

let User = mongoose.model("User", userSchema, "users");

module.exports = User;
