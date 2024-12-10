let express = require("express");
let asyncHandler = require("express-async-handler");
let mongoose = require("mongoose");
let multer = require("multer");
let uuid = require("uuid").v4;
const fs = require("fs");

let Request = require("../models/request");
let User = require("../models/user");
let Group = require("../models/group");
const { protect } = require("../middleware/authMiddleware");
const Invitation = require("../models/invitation");
const Attachment = require("../models/attachment");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    console.log(file);
    const { originalname } = file;
    cb(null, uuid() + "-" + originalname);
  },
});

const upload = multer({ storage });

let groupRouter = express.Router();

//APIS
//get All Groups
groupRouter.get(
  "/getAll",
 
  asyncHandler(async (req, res) => {
    const pageSize = 4;
    const page = Number(req.query.pageNumber) || 1;
    const count = await Group.countDocuments({});
    const allGroups = await Group.find({})
    .populate("coach")
      .populate("participants")
      .populate("attachments")
      .populate({
        path: "requests",
        model: "Request",
        populate: {
          path: "requester",
          model: "User",
        },
      })
    const groups = await Group.find({})
      .populate("coach")
      .populate("participants")
      .populate("attachments")
      .populate({
        path: "requests",
        model: "Request",
        populate: {
          path: "requester",
          model: "User",
        },
      })
      .limit(pageSize)
      .skip((page - 1) * pageSize);

    res.status(200).json({allGroups, groups, page, pages: Math.ceil(count / pageSize) });
  })
);

//get Group
groupRouter.get(
  "/:id",
  protect,
  asyncHandler(
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        res.status(401).json("Group id is not valid");
      }
      const group = await Group.findById(id)
        .populate("coach")
        .populate("participants")
        .populate("attachments")
        .populate({
          path: "requests",
          model: "Request",
          populate: {
            path: "requester",
            model: "User",
          },
        });

      if (!group) {
        res.status(401);
        throw new Error("Group not found");
      } else {
        res.status(200).json(group);
      }
    })
  )
);
//create group
groupRouter.post(
  "/create",
  protect,
  asyncHandler(async (req, res) => {
    let { name } = req.body;
    if (!name) {
      res.status(401);
      throw new Error("Plesae add a name");
    }
    let coach = req.currentUser["_id"];
    let newGroup = new Group({
      name: name,
      coach: coach,
      participants: [coach],
    });
    let result = await newGroup.save();
    res.status(200).json(result);
  })
);

//delete group
groupRouter.delete(
  "/delete",
  asyncHandler(async (req, res) => {
    let groupId = req.body.groupId;
    if (!mongoose.isValidObjectId(groupId)) {
      res.status(403);
      throw new Error("groupId Is not valid");
    }
    let response = await Group.deleteOne({ _id: groupId });
    res.send(JSON.stringify(response));
  })
);

//Send Group Request
groupRouter.post(
  "/sendRequest",
  protect,
  asyncHandler(async (req, res) => {
    let id = req.currentUser["_id"];
    let groupId = req.body.groupId;
    if (!mongoose.isValidObjectId(groupId)) {
      res.status(403);
      throw new Error("groupId Is not valid");
    }

    //fetch the group with populate the requests and the Users
    let WantedGroup = await Group.findById(groupId).populate({
      path: "requests",
      model: "Request",
      populate: {
        path: "requester",
        model: "User",
      },
    });

    let requests = WantedGroup["requests"];
    let addRequest = true;
    requests.forEach((request) => {
      if (id.equals(request["requester"]["id"])) {
        addRequest = false;
        res.status(401);
        throw new Error("You Already Request To Join This Group");
      }
    });
    if (addRequest === true) {
      let newRequest = new Request({
        group: groupId,
        requester: id,
      });
      let requestResult = await newRequest.save();
      requestResult.populate("requester");
      requests.push(requestResult);

      WantedGroup["requests"] = requests;
      await WantedGroup.save();
      res.status(200).json(requestResult);
    }
  })
);

//Respond To Group Request
groupRouter.post(
  "/respondToRequest",
  protect,
  asyncHandler(async (req, res) => {
    let requestId = req.body.requestId;
    let acceptance = req.body.acceptance;
    if (toString.call(acceptance) !== "[object Boolean]") {
      res.status(403);
      throw new Error("acceptance shoulde be a boolean value");
    }
    let requestResult = await Request.findById(requestId);
    let groupId = requestResult["group"];
    let userId = requestResult["requester"];

    let WantedGroup = await Group.findById(groupId)
      .populate({
        path: "requests",
        model: "Request",
        populate: {
          path: "requester",
          model: "User",
        },
      })
      .populate("coach");
    if (!WantedGroup.coach._id.equals(req.currentUser._id)) {
      v;
      res.status(401);
      throw new Error("Not authorized, not the coach of the group");
    } else {
      let requests = WantedGroup["requests"];

      //Filtering Requests to remove the Specific Request
      requests = requests.filter((request) => {
        return !userId.equals(request["requester"]["_id"]);
      });
      WantedGroup["requests"] = requests;
      if (acceptance) WantedGroup["participants"].push(userId);

      await WantedGroup.save();
      let response = await Request.findById(requestId).populate("requester");

      await Request.deleteOne({
        _id: requestId,
      });
      console.log(response);
      res.status(200).json({
        ...response.requester.toObject(),
        acceptance: acceptance,
        _id: response._id,
      });
    }
  })
);

//delete request
groupRouter.delete(
  "/deleteRequest/:requestId",
  protect,
  asyncHandler(async (req, res) => {
    let requestId = req.params.requestId;
    if (!mongoose.isValidObjectId(requestId)) {
      res.status(401);
      throw new Error("requestId not valid");
    }
    let fetchedRequest = await Request.findById(requestId);
    if (!fetchedRequest) {
      res.status(401);
      throw new Error("Request not found");
    }
    if (!fetchedRequest.requester.equals(req.currentUser._id)) {
      res.status(401);
      throw new Error("Not Authorized");
    }
    //first you have to delete the request from the group requests array
    let groupId = fetchedRequest["group"];

    let fetchedGroup = await Group.findById(groupId);

    let requests = fetchedGroup["requests"];

    requests = requests.filter((request) => {
      return request["_id"] != requestId;
    });

    fetchedGroup["requests"] = requests;

    await fetchedGroup.save();

    //now you can delete the request object itself
    await Request.deleteOne({ _id: requestId });
    res.status(200).json(fetchedRequest);
  })
);

//invite to group
groupRouter.post(
  "/invite",
  protect,
  asyncHandler(async (req, res) => {
    let groupId = req.body.groupId;
    let userId = req.body.userId;
    if (!mongoose.isValidObjectId(groupId)) {
      res.status(403);
      throw new Error("groupId Is not valid");
    }
    if (!mongoose.isValidObjectId(userId)) {
      res.status(403);
      throw new Error("userId Is not valid");
    }
    const WantedGroup = await Group.findById(groupId);
    if (!WantedGroup || WantedGroup === null) {
      res.status(401);
      throw new Error("Group not found");
    }
    let fetchedUser = await User.findById(userId);
    if (!fetchedUser || fetchedUser === null) {
      res.status(401);
      throw new Error("User not found");
    }
    // const userIsMember = await WantedGroup.participants.find((memeber) =>
    //   memeber._id.equals(userId)
    // );
    // console.log(userIsMember);
    // if (userIsMember) {
    //   res.status(401);
    //   throw new Error("User already joined the group");
    // }
    //check if the invitation exist
    const invitationExist = await Invitation.findOne({
      group: groupId,
      invitedUser: userId,
    });
    if (invitationExist) {
      res.status(401);
      throw new Error("User already invited to this group");
    }
    let newInvitation = new Invitation({
      group: groupId,
      invitedUser: userId,
    });

    let invitationResult = await newInvitation.save();

    let invitations = fetchedUser["invitations"];

    invitations.push(invitationResult);

    fetchedUser["invitations"] = invitations;
    await fetchedUser.save();
    invitationResult = await invitationResult.populate("group");
    invitationResult = await invitationResult.populate("invitedUser");
    res.status(200).json(invitationResult);
  })
);

groupRouter.post(
  "/respondToInvite",
  protect,
  asyncHandler(async (req, res) => {
    let invitationId = req.body.invitationId;
    let acceptance = req.body.acceptance;
    if (!mongoose.isValidObjectId(invitationId)) {
      res.status(403);
      throw new Error("invitationId Is not valid");
    }

    if (toString.call(acceptance) !== "[object Boolean]") {
      res.status(403);
      throw new Error("acceptance shoulde be a boolean value");
    }

    let fetchedInvitation = await Invitation.findById(invitationId);
    let userId = fetchedInvitation["invitedUser"];
    let fetchedUser = await User.findById(userId).populate("invitations");
    let invitations = fetchedUser["invitations"];

    //deleting the Invitation from UserObject
    let updatedInvitations = invitations.filter((invitation) => {
      return invitationId !== invitation["_id"].toString();
    });
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          invitations: updatedInvitations,
        },
      }
    );

    //if the user accept add it to the partcipents of the group
    if (acceptance) {
      let fetchedGroup = await Group.findById(fetchedInvitation["group"]);
      let participants = fetchedGroup["participants"];
      participants.push(userId);
      fetchedGroup["participants"] = participants;
      await fetchedGroup.save();
    }
    //deleting the Invitation from DB
    await Invitation.deleteOne({ _id: invitationId });
    res.status(200).json(fetchedInvitation);
  })
);
//delete invite
groupRouter.delete(
  "/deleteInvitation/:invitationId",
  protect,
  asyncHandler(async (req, res) => {
    let { invitationId } = req.params;

    let fetchedInvite = await Invitation.findById(invitationId)
      .populate("group")
      .populate("invitedUser");

    //first you have to delete the invite from the User invitations array
    let invitedUserId = fetchedInvite["invitedUser"];

    let fetchedUser = await User.findById(invitedUserId);

    let invitations = fetchedUser["invitations"];

    invitations = invitations.filter((invitation) => {
      return invitation["_id"] != invitationId;
    });

    fetchedUser["invitations"] = invitations;

    let saveResponse = await fetchedUser.save();

    //now you can delete the invitation object itself
    await Invitation.deleteOne({ _id: invitationId });
    res.status(200).json(fetchedInvite);
  })
);

// get all valid users to send them invitations
groupRouter.get(
  "/invitation/:groupId/:keyword",
  protect,
  asyncHandler(async (req, res) => {
    const { keyword, groupId } = req.params;
    let users = await User.find({
      userName: {
        $regex: keyword,
        $options: "i",
      },
    });
    const group = await Group.findById(groupId)
      .populate({
        path: "requests",
        model: "Request",
        populate: {
          path: "requester",
          model: "User",
        },
      })
      .populate("participants");
    //Now filter all users whose already joined the group or sent request to join the group or who already got invited
    const invitations = await Invitation.find({ group: groupId }).populate(
      "invitedUser"
    );
    users = users.filter(
      (user) =>
        !group.participants.some(
          (participant) => participant._id.toString() === user._id.toString()
        ) &&
        !group.requests.some(
          (request) => request.requester._id.toString() === user._id.toString()
        ) &&
        !invitations.some(
          (invition) =>
            invition.invitedUser._id.toString() === user._id.toString()
        )
    );
    res.status(200).json(users);
  })
);

// get all invitations to this group
groupRouter.get(
  "/invitation/:groupId",
  protect,
  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) {
      res.status(403);
      throw new Error("groupId Is not valid");
    }
    const groupInvitations = await Invitation.find({ group: groupId })
      .populate("group")
      .populate("invitedUser");
    res.status(200).json(groupInvitations);
  })
);
//get All Groups as a coach
groupRouter.get(
  "/getAsCoach",
  protect,
  asyncHandler(async (req, res) => {
    let userId = req.currentUser._id;

    let groups = await Group.find({ coach: userId });

    res.send(JSON.stringify(groups));
  })
);

//get All Groups as partcipent
groupRouter.get(
  "/getAsPartcipent/:userName",
  asyncHandler(async (req, res) => {
    const pageSize = 4;
    const page = Number(req.query.pageNumber) || 1;
    let { userName } = req.params;
    const user = await User.findOne({ userName });
    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }
    let allGroups = await Group.find()
      .populate("coach")
      .populate("participants")
      .populate("attachments")
      .populate({
        path: "requests",
        model: "Request",
        populate: {
          path: "requester",
          model: "User",
        },
      });
    allGroups = allGroups.filter((group) => {
      let participants = group.participants;
      return participants.some((participant) =>
        participant._id.equals(user._id)
      );
    });
    const count = allGroups.length;
    let groups = [];
    for (
      let i = (page - 1) * pageSize;
      i < Math.min(count, page * pageSize);
      i++
    ) {
      groups.push(allGroups[i]);
    }
    res.status(200).json({ groups, page, pages: Math.ceil(count / pageSize) });
  })
);

groupRouter.delete(
  "/deleteGroup/:groupId",
  protect,
  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) {
      res.status(401);
      throw new Error("Group not found");
    }
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(401);
      throw new Error("Group not found");
    }
    if (
      group.coach.equals(req.currentUser._id) ||
      req.currentUser.role === "admin"
    ) {
      const groupInvitations = await Invitation.find({ group: groupId });
      await User.updateMany(
        {},
        {
          $pull: { invitations: { $in: groupInvitations } },
        }
      );
      await Invitation.deleteMany({ group: groupId });
      await Request.deleteMany({ group: groupId });
      await Group.deleteOne({ _id: groupId });
      res.status(200).json(group);
    } else {
      res
        .status(401)
        .json("Not Allowed You are not the group coach or an admin");
    }
  })
);

groupRouter.delete(
  "/:groupId/removeParticipants/:participantId",
  protect,
  asyncHandler(async (req, res) => {
    let { participantId, groupId } = req.params;

    console.log(participantId, groupId);
    let result = "result";

    let fetchedGroup = await Group.findById(groupId);

    //if the removed User is the coach then the group should be deleted
    if (participantId == fetchedGroup["coach"]) {
      let deleteResult = await Group.deleteOne({ _id: groupId });
      result = deleteResult;
    } else {
      let participants = fetchedGroup["participants"];

      let filteredParticipants = participants.filter((partcipent) => {
        return partcipent["_id"] != participantId;
      });

      fetchedGroup["participants"] = filteredParticipants;
      let saveResult = await fetchedGroup.save();
      result = saveResult;
      result = await result.populate("participants");
    }
    res.status(200).json(result);
  })
);

//add an attachment for a group
groupRouter.post(
  "/addAttachment/:groupId",
  protect,
  upload.single("attach"),
  asyncHandler(async (req, res) => {
    let groupId = req.params.groupId;
    let file = req.file;
    let newAttachment = new Attachment({
      originalname: file["originalname"],
      newName: file["filename"],
      path: file["path"],
      size: file["size"],
      type: file["mimetype"],
      group: groupId,
    });

    let attachResponse = await newAttachment.save();

    let fetchedGroup = await Group.findById(groupId);

    let attachments = fetchedGroup["attachments"];

    attachments.push(attachResponse);

    fetchedGroup[attachments] = attachments;

    let groupResonse = await fetchedGroup.save();

    res.json(attachResponse);
  })
);

//delete an attachment from a group
groupRouter.delete(
  "/deleteAttachment/:attachmentId",
  protect,
  asyncHandler(async (req, res) => {
    let { attachmentId } = req.params;

    let fetchedAttachment = await Attachment.findById(attachmentId);

    let groupId = fetchedAttachment["group"];

    //delete the Actual Attachment File
    fs.unlink(fetchedAttachment["path"], (deleteFileResponse) => {
      console.log(deleteFileResponse);
    });

    //delete the attachment from the Database
    let deleteResponse = await Attachment.deleteOne({ _id: attachmentId });

    let fetchedGroup = await Group.findById(groupId);

    let attachments = fetchedGroup["attachments"];

    //delete the attachment id from the group's attachments list
    let filteredAttachmetns = attachments.filter((attachment) => {
      return attachment["_id"] != attachmentId;
    });

    fetchedGroup["attachments"] = filteredAttachmetns;

    let saveResponse = await fetchedGroup.save();

    res.json(fetchedAttachment);
  })
);

module.exports = groupRouter;
