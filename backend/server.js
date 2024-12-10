let mongoose = require("mongoose");
let express = require("express");
const { errorHandler } = require("./middleware/error");

//models
let User = require("./models/user");
let Problem = require("./models/problem");
let Group = require("./models/group");
let Level = require("./models/level");
let Request = require("./models/request");
let logger = require("./logger.js");
const CryptoJS = require("crypto-js");
//create the server
let server = express();
const path = require("path");
//Routers
let userRouter = require("./routes/userRouter.js");
let authRouter = require("./routes/authRouter.js");
let groupRouter = require("./routes/groupRouter.js");
let levelRouter = require("./routes/levelRouter.js");
let problemRouter = require("./routes/problemRouter.js");
let messageRouter = require("./routes/messageRouter.js");
const serverConstants = require("./serverConstants.js");
const chatRouter = require("./routes/chatRouter");
const notificationRouter = require("./routes/notificationRouter");
const blogRouter = require('./routes/blogRouter');
//medllewaress
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

server.all("*", (req, res, next) => {
  let objToLog = {
    Path: req.path,
    Method: req.method,
    Body: req.body,
    timestamp: Date.now(),
  };
  logger.info(objToLog);
  return next();
});

server.use("/group", groupRouter);
server.use("/uploads", express.static("uploads"));
server.use("/user", userRouter);
server.use("/auth", authRouter);
server.use("/level", levelRouter);
server.use("/problem", problemRouter);
server.use("/message", messageRouter);
server.use("/chat", chatRouter);
server.use("/notification", notificationRouter);
server.use('/blog', blogRouter);
server.use(errorHandler);

//start server

const http = server.listen(serverConstants.server_port, () => {
  logger.info("server is lestining on port " + serverConstants.server_port);
});

//connect to mongoDB
const dbUrI =
  "mongodb+srv://" +
  serverConstants.MongoDBusername +
  ":" +
  serverConstants.MongoDBpassword +
  "@cluster0.fhqit.mongodb.net/GraduationProject?retryWrites=true&w=majority";

//for testing
//mongodb+srv://hisham:hisham1234@cluster0.fhqit.mongodb.net/GraduationProject?retryWrites=true&w=majority

mongoose.connect(dbUrI).then(() => {
  console.log("successfully connected");
  logger.info("successfully connected");
});

const io = require("socket.io")(http, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});
io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData.userName);
    socket.emit("connected");
  });
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    if (
      newMessageRecieved.chat.users[0].userName ===
      newMessageRecieved.chat.users[1].userName
    ) {
      return;
    }
    if (
      newMessageRecieved.sender.userName ===
      newMessageRecieved.chat.users[0].userName
    ) {
      socket
        .in(newMessageRecieved.chat.users[1].userName)
        .emit("message recieved", newMessageRecieved);
    } else {
      socket
        .in(newMessageRecieved.chat.users[0].userName)
        .emit("message recieved", newMessageRecieved);
    }
  });
  socket.on("new invitation", (newInvitation) => {
    socket
      .in(newInvitation.invitedUser.userName)
      .emit("invitation recieved", newInvitation);
  });
  socket.on("cancel invitation", (canceledInvitation) => {
    socket
      .in(canceledInvitation.invitedUser.userName)
      .emit("invitation canceled", canceledInvitation);
  });
  socket.off("setup", () => {
    console.log("user left");
    socket.leave(userData.userName);
  });
});