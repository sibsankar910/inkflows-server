import { Follow } from "../models/follow.model.js"
import { User } from "../models/user.model.js"
import { asyncHandler } from "../utils/async-handler.js"
import { ApiError } from "../utils/api-error.js"
import { ApiResponse } from "../utils/api-response.js"
import mongoose from "mongoose"

const updateFollowersAndFollowings = async (followingTo, userId) => {
    const updateCount = await Follow.aggregate([
        {
            $facet: {
                // Counts followers of followingTo user
                followers: [
                    { $match: { followingTo: new mongoose.Types.ObjectId(followingTo) } },
                    { $group: { _id: null, count: { $sum: 1 } } },
                    { $project: { _id: 0, count: 1 } }
                ],
                // counts followings of current user
                following: [
                    { $match: { followedBy: userId } },
                    { $group: { _id: null, count: { $sum: 1 } } },
                    { $project: { _id: 0, count: 1 } }
                ]
            }
        },
        {
            $project: {
                followersCount: { $arrayElemAt: ["$followers.count", 0] },
                followingsCount: { $arrayElemAt: ["$following.count", 0] }
            }
        }
    ])

    // Updates current user Followings
    await User.findByIdAndUpdate(userId,
        {
            $set: {
                followingsCount: updateCount[0]?.followingsCount || 0
            }
        },
        {
            new: true
        }
    )
    // Updates followingTo user followers
    await User.findByIdAndUpdate(followingTo,
        {
            $set: {
                followersCount: updateCount[0]?.followersCount || 0
            }
        },
        {
            new: true
        }
    )
}

const createFollow = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    const { followingTo } = req.body
    if (!userId) throw new ApiError(401, "Invalid Request")

    const prevFollowed = await Follow.findOne({ followingTo: followingTo, followedBy: userId })

    if (prevFollowed) throw new ApiError(400, "User already followed this profile")

    await Follow.create({ followingTo: followingTo, followedBy: userId })

    // Updates followers of followingTo user and followings of current user in User Collections
    await updateFollowersAndFollowings(followingTo, userId)

    return res.status(200)
        .json(new ApiResponse(200, {}, "Follow successfully"))
})

const removeFollow = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    const { followingTo } = req.body
    if (!userId) throw new ApiError(401, "Invalid Request")

    const prevFollowed = await Follow.findOne({ followingTo: followingTo, followedBy: userId })

    if (!prevFollowed) throw new ApiError(400, "User not followed this profile")

    await Follow.findByIdAndDelete(prevFollowed._id)

    // Updates followers of followingTo user and followings of current user in User Collections
    await updateFollowersAndFollowings(followingTo, userId)

    return res.status(200)
        .json(new ApiResponse(200, {}, "Unfollowed successfully"))
})

const checkFollow = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    const { followingTo } = req.params;

    if (!followingTo || followingTo === undefined) throw new ApiError(400, "User id is required")

    const prevFollowed = await Follow.findOne({ followingTo: followingTo, followedBy: userId })

    let isFollowed = false

    if (prevFollowed) isFollowed = true

    return res.status(200)
        .json(new ApiResponse(200, { isFollowed }, "Follow fetched"))
})


export {
    createFollow,
    removeFollow,
    checkFollow
}