let mongoose = require("mongoose");
let Schema = mongoose.Schema;
const Problem = require("./problem");

let levelSchema = new Schema({
  number: {
    type: Number,
    required: true,
    unique: true,
  },
  topic: {
    type: String,
  },
  description: {
    type: String,
  },
  problems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
    },
  ],
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

levelSchema.pre("save", function (next) {
  this.UpdatedAt = Date.now();
  next();
});

let Level = mongoose.model("Level", levelSchema, "levels");
module.exports = Level;
