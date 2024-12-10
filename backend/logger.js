const winston = require("winston");
let { createLogger } = require("winston");

let logger = createLogger({
  transports: [new winston.transports.File({ filename: "ServerLogs.log" })],
});

module.exports = logger;
