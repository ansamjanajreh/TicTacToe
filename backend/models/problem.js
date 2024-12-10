let mongoose = require("mongoose");
const Level = require("./level");
const User = require("./user");
let Schema = mongoose.Schema;

let problemSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
  },
  contest: {
    type: Number,
    required: true,
  },
  index: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    immutable: true,
  },
  lastUpdateAt: {
    type: Date,
    default: Date.now(),
  },
});

problemSchema.pre("save", function (next) {
  this.UpdatedAt = Date.now();
  next();
});

let Problem = mongoose.model("Problem", problemSchema, "problems");

module.exports = Problem;
