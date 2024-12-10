let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let attachmentSchema = new Schema({
  originalname: {
    type: String,
    required: true,
  },
  newName: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
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

attachmentSchema.pre("save", function (next) {
  this.UpdatedAt = Date.now();
  next();
});

let Attachment = mongoose.model("Attachment", attachmentSchema, "attachments");
module.exports = Attachment;
