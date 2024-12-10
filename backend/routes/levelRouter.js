let express = require("express");
let bcrypt = require("bcrypt");
let body_parser = require("body-parser");
let mongoose = require("mongoose");
let fetch = require("node-fetch");
let asyncHandler = require("express-async-handler");

let User = require("../models/user");
const Level = require("../models/level");
const { protect } = require("../middleware/authMiddleware");

//define levelRouter
let levelRouter = express.Router();

//create level
levelRouter.post(
  "/create",
  asyncHandler(async (req, res) => {
    let { number, topic, description } = req.body;

    let newLevel = new Level({
      number: number,
      topic: topic,
      description: description,
    });

    let response = await newLevel.save();
    res.status(200).json(response);
  })
);

//delete level
levelRouter.delete(
  "/delete",
  asyncHandler(async (req, res) => {
    let { levelId } = req.body;

    if (!mongoose.isValidObjectId(levelId)) {
      res.status(403);
      throw new Error("levelId Is not valid");
    }

    let response = await Level.deleteOne({ _id: levelId });
    res.status(200).json(response);
  })
);

//add problem to level
levelRouter.put(
  "/addProblem",
  protect,
  asyncHandler(async (req, res) => {
    let { problemId, levelId } = req.body;
    if (!mongoose.isValidObjectId(levelId)) {
      res.status(403);
      throw new Error("levelId Is not valid");
    }

    if (!mongoose.isValidObjectId(problemId)) {
      res.status(403);
      throw new Error("ProblemId Is not valid");
    }

    let wantedLevel = await Level.findById(levelId).populate("problems");

    if (!wantedLevel) {
      res.status(404);
      throw new Error("No level with this Id");
    }

    if (wantedLevel.problems.find((problem) => problem._id.equals(problemId))) {
      res.status(401);
      throw new Error("The problem already added");
    }
    let problems = wantedLevel.problems;

    problems.push(problemId);

    let response = await wantedLevel.save();

    res.status(200).json(response);
  })
);

//get Specifiv Level
levelRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    let levelId = req.query.levelId;
    let level = "";
    if (levelId && !mongoose.isValidObjectId(levelId)) {
      res.status(403);
      throw new Error("levelId Is not valid");
    }
    if (!levelId) {
      level = await Level.find({}).populate("problems");
    } else {
      level = await Level.findById(levelId).populate("problems");

      if (level === "" || !level) {
        res.status(404);
        throw new Error("level is not found");
      }
      level.problems.sort((a, b) => a.rating - b.rating);
    }

    res.status(200).json(level);
  })
);

//get All Solved Problems for A User
levelRouter.get(
  "/solvedProblems",
  protect,
  asyncHandler(async (req, res) => {
    let { handle } = req.currentUser;
    let levelId = req.query.levelId;
   // console.log(handle);
    //console.log(levelId);
    if (!mongoose.isValidObjectId(levelId)) {
      res.status(403);
      throw new Error("levelId Is not valid");
    }

    let level = await Level.findById(levelId).populate("problems");
    let levelProblems = level.problems;

    let result = await fetch(
      "https://codeforces.com/api/user.status?handle=" + handle
    );

    let data = await result.json();

    let submissions = data.result;

    let acceptedSubmissions = submissions.filter((submission) => {
      return submission.verdict == "OK";
    });

    let actualProblems = acceptedSubmissions.map((submission) => {
      return {
        contestId: submission.problem.contestId,
        index: submission.problem.index,
      };
    });
    let solvedProblems = levelProblems.filter((problemInLevel) => {
      let actualProblem = {
        contestId: problemInLevel["contest"],
        index: problemInLevel["index"],
      };

      let search = actualProblems.find((problem) => {
        return (
          problem.contestId == actualProblem.contestId &&
          problem.index == actualProblem.index
        );
      });

      return search;
    });
   // console.log(solvedProblems);
    res.status(200).json(solvedProblems);
  })
);

module.exports = levelRouter;
