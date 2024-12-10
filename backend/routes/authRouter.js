let express = require("express");
let bcrypt = require("bcrypt");
let fetch = require("node-fetch");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");
const serverConstants = require("../serverConstants.js");
const nodeoutlook = require("nodejs-nodemailer-outlook");
const { JWT_SECRET } = require("../serverConstants");
let User = require("../models/user");

//define authRouter
let authRouter = express.Router();

//User SignUp
authRouter.post(
  "/signUp",
  asyncHandler(async (req, res) => {
    let { userName, email, password, handle, phone } = req.body;
    if (!userName || !email || !password || !handle) {
      res.status(400);
      throw new Error("Please add all fields");
    }
    console.log(userName, email, password, handle, phone);
    let result = await fetch(
      "https://codeforces.com/api/user.info?handles=" + handle
    );

    let codeforcesUser = await result.json();

    console.log(codeforcesUser);
    if (codeforcesUser["status"] == "FAILED") {
      res.status(400);
      throw new Error("Codeforces handle is not correct");
    }
    const userExist = await User.findOne({ email });
    if (userExist) {
      res.status(400);
      throw new Error("User already exists");
    }
    //hashing password before store it in DB

    let hashedPassword = await bcrypt.hashSync(
      password,
      serverConstants.bcryptRounds
    );

    //Create User Object
    let newUser = new User({
      userName: userName,
      email: email,
      handle: handle,
      phone: phone,
      password: hashedPassword,
      level: "622345c1373a2b782b593f62",
      role: "normal",
      invitations: [],
    });
    // Save in DB
    let response = await newUser.save();

    res.status(200).json({
      userName: response.userName,
      token: generateToken(response._id),
      role: response.role,
      email: response.email,
      handle: response.handle,
      invitations: response.invitations,
    });
  })
);

authRouter.post(
  "/signIn",
  asyncHandler(async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error("Please add all fields");
    }
    let fitchedUser = await User.findOne({ email: email }).populate({
      path: "invitations",
      model: "Invitation",
      populate: {
        path: "group",
        model: "Group",
      },
      populate: {
        path: "invitedUser",
        model: "User",
      }
    });
    if (fitchedUser == undefined) {
      res.status(400);
      throw new Error("The Email Or The Password Is Incorrect");
    }
    let fitchedPassword = fitchedUser["password"];

    let login = await bcrypt.compareSync(password, fitchedPassword);
    if (login) {
      res.status(200).json({
        userName: fitchedUser.userName,
        token: generateToken(fitchedUser._id),
        role: fitchedUser.role,
        email: fitchedUser.email,
        handle: fitchedUser.handle,
        invitations: fitchedUser.invitations ? fitchedUser.invitations : [],
      });
    } else {
      res.status(400);
      throw new Error("The Email Or The Password Is Incorrect");
    }
  })
);

//change password
authRouter.put("/changePassword", protect, async (req, res) => {
  let { curPass, newPass, rePass } = req.body;

  if (newPass != rePass) {
    res.status(400);
    throw new Error("new Password does not match the RePassword");
  }
  let userId = req.currentUser["_id"];

  let fitchedUser = await User.findById(userId);
  fitchedUser.password = await bcrypt.hashSync(
    newPass,
    serverConstants.bcryptRounds
  );

  let response = await fitchedUser.save();
  res.status(200).json(response);
});

authRouter.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  const userExist = await User.findOne({ email });
  if (!userExist) {
    res.status(401).json("Email not Found");
  } else {
    nodeoutlook.sendEmail({
      auth: {
        user: "cpptuk@hotmail.com",
        pass: "Zx1596321*",
      },
      from: "cpptuk@hotmail.com",
      to: email,
      subject: "Reset Password CP-PTUK",
      html: `<a href=http://localhost:3000/reset-password/${generateToken(
        userExist._id,
        "900s"
      )}>To reset the password click this link</a>`,
    });
    res.status(200).json("Check your email to reset the password");
  }
});

authRouter.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.id);
  res.status(200).json(user);
});

authRouter.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401).json("Something went wrong please try later");
  } else {
    user.password = await bcrypt.hashSync(
      password,
      serverConstants.bcryptRounds
    );
    await user.save();
    res.status(200).json("Password updated");
  }
});

const generateToken = (id, time = "30d") => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: time,
  });
};
module.exports = authRouter;
