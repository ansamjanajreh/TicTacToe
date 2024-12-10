let express = require("express");
let asyncHandler = require("express-async-handler");
let mongoose = require("mongoose");
const axios = require("axios");

let User = require("../models/user");
let Group = require("../models/group");
let Request = require("../models/request");
const { protect } = require("../middleware/authMiddleware");
const Level = require("../models/level");
const Problem = require("../models/problem");
const Invitaion = require("../models/invitation");
const Message = require("../models/message");

//define userRouter
let userRouter = express.Router();

userRouter.get(
  "/:userName",
  asyncHandler(async (req, res) => {
    const { userName } = req.params;
    const data = await User.findOne({ userName: userName }).populate("level");
    if (!data) {
      res.status(401);
      throw new Error("username not found");
    } else {
      res.status(200).json(data);
    }
  })
);

userRouter.get(
  "/codeforcesInfo/:userName",
  asyncHandler(async (req, res) => {
    const { userName } = req.params;
    const data = await User.findOne({ userName: userName });
    if (!data) {
      res.status(401);
      throw new Error("User not exist");
    } else {
      const handle = data.handle;
      const codeforcesInfo = await axios.get(
        "https://codeforces.com/api/user.info?handles=" + handle
      );

      if (!codeforcesInfo) {
        res.status(400);
        throw new Error("userName not Found");
      } else {
        res.status(200).json(codeforcesInfo.data.result[0]);
      }
    }
  })
);

//Delete User =>Admin
userRouter.delete(
  "/deleteUser",
  asyncHandler(async (req, res) => {
    let userId = req.body.userId;

    if (!mongoose.isValidObjectId(userId)) {
      res.status(403);
      throw new Error("userId Is not valid");
    }

    //delete the User's groups
    let groupsAsCoachDeleteResponse = await Group.deleteMany({ coach: userId });

    let groups = await Group.find().populate({
      path: "requests",
      model: "Request",
      populate: {
        path: "requester",
        model: "User",
      },
    });

    //delete the requests from this users in the remaining groups
    groups.forEach((group) => {
      let requests = group["requests"];

      requests = requests.filter((request) => {
        let requester = request["requester"];
        return requester["_id"] != userId;
      });
      group["requests"] = requests;
      group.save();
    });

    //delete the invitations of for this user
    let invitationsAsInvitedUserDeleteResponse = await Invitaion.deleteMany({
      invitedUser: userId,
    });

    //delete the messages for created by this user
    let messagesDeleteResponse = await Message.deleteMany({
      sender: userId,
    });

    //delete the user himself
    let response = await User.deleteOne({ _id: userId });
    res.send(JSON.stringify(response));
  })
);
//change handle
userRouter.put(
  "/changeHandle",
  protect,
  asyncHandler(async (req, res) => {
    let userId = req.currentUser.id;
    let handle = req.body.handle;

    if (!mongoose.isValidObjectId(userId)) {
      res.status(403);
      throw new Error("userId Is not valid");
    }

    //chaeck if the new handle is existed on codeforces
    let result = await fetch(
      "https://codeforces.com/api/user.info?handles=" + handle
    );

    let codeforcesUser = await result.json();

    if (codeforcesUser["status"] == "FAILED")
      throw new Error("Coddeforces Handle does not exist");

    let user = await User.findById(userId);
    user.handle = handle;
    let response = await result.save();
    res.send(JSON.stringify("handle has changed successfully " + response));
  })
);

userRouter.get(
  "/problem/:userName",
  asyncHandler(async (req, res) => {
    const pageSize = 5;
    const page = Number(req.query.pageNumber) || 1;
    const { userName } = req.params;
    const problems = await Problem.find({});
    const user = await User.findOne({ userName: userName });
    if (!user) {
      res.status(401);
      throw new Error("username not exist");
    } else {
      const handle = user.handle;

      let result = await axios.get(
        "https://codeforces.com/api/user.status?handle=" + handle
      );

      const { data } = result;
      const submission = data.result;
      const acceptedSubmissions = submission.filter(
        (sub) => sub.verdict == "OK"
      );

      const problemSolvedOnCodeforces = acceptedSubmissions.map((accSub) => {
        //  console.log(accSub.problem. name);
        return {
          contestId: accSub.problem.contestId,
          index: accSub.problem.index,
          name: accSub.problem.name,
        };
      });

      const problemSolvedHere = problems.filter((problem) => {
        return problemSolvedOnCodeforces.find(
          (psoc) =>
            psoc.contestId === problem.contest && psoc.index === problem.index
        );
      });
      let count = problemSolvedHere.length;
      let problemSolved = [];
      for (
        let i = (page - 1) * pageSize;
        i < Math.min(page * pageSize, count);
        i++
      ) {
        problemSolved.push(problemSolvedHere[i]);
      }
      res
        .status(200)
        .json({ problemSolved, page, pages: Math.ceil(count / pageSize) });
    }
  })
);

userRouter.put(
  "/changeRole",
  protect,
  asyncHandler(async (req, res) => {
    let userId = req.body.userId;

    let wantedUser = await User.findById(userId);

    //if he is admin make him normal and vice versa
    let role = wantedUser["role"];
    if (role === "normal") wantedUser["role"] = "admin";
    else wantedUser["role"] = "normal";
    wantedUser.save();

    res.status(201).json("role changed successfully");
  })
);
module.exports = userRouter;
