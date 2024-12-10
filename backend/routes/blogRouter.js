const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const blogRouter = express.Router();
let asyncHandler = require("express-async-handler");
const Blog = require("../models/blog");
const Group = require("../models/group")
blogRouter.post(
  "/create",
  asyncHandler(async (req, res) => {
 
    const { texts, attachments, groupId, heading } = req.body;
    console.log(req.body);
    const blog = new Blog({
      texts: texts,
      attachments: attachments,
      group: groupId,
      heading: heading
    });

    const response = await blog.save();
    const datad = await Blog.find();
    
    console.log(datad);

    console.log(response);
    res.status(200).json(response);
  })
);

blogRouter.get("/:id", asyncHandler(async(req, res) => {
    const {id} = req.params;
    console.log(id);
    const response = await Blog.findById(id).populate({
        path: "attachments",
        populate: {
          path: "attachment",
          model: "Attachment",
        },
      })
    
    
    res.status(200).json(response);
})
);


blogRouter.get("/group/:groupId", asyncHandler(async(req, res) => {
  const {groupId} = req.params
  console.log('-------------------', groupId);
    const response = await Blog.find({group: groupId}).populate({
        path: "attachments",
        populate: {
          path: "attachment",
          model: "Attachment",
        },
        
      })
      .populate({
        path: "group",
        populate: {
          path: "coach",
          model: "User"
        }
      })
   
    console.log(response);
    res.status(200).json(response);
})
);
module.exports = blogRouter;