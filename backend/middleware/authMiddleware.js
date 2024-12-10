const jwt = require("jsonwebtoken");
const asyncHAndler = require("express-async-handler");
const User = require("../models/user");
const { JWT_SECRET } = require("../serverConstants");
const protect = asyncHAndler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
  
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.currentUser = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      res.status(401);
      throw new Error("Not authorized");
    }
  }
  if (!token) {
    res.status(401);
    throw new Error("No authorized, no token");
  }
});

const isCoach = asyncHAndler(async (req, res, next) => {
  if (req.user && req.user.role !== "normal") {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as a coach");
  }
});

const isAdmin = asyncHAndler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an admin");
  }
});
module.exports = { protect, isCoach, isAdmin };
