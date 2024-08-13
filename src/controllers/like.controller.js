import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/async-handler.js"
import { ApiError } from "../utils/api-error.js"
import { ApiResponse } from "../utils/api-response.js"
import { Blog } from "../models/blog.model.js";

const createLike = asyncHandler(async (req, res) => {
    const { blogId } = req.body
    const userId = req.user?._id

    if (!blogId || !userId) throw new ApiError(400, "Invalid request")

    const prevLike = await Like.findOne({ likedByUser: userId, postId: blogId })

    if (prevLike) throw new ApiError(402, "User already liked")

    await Like.create({
        postId: blogId,
        likedByUser: userId
    })

    const likeCounts = await Like.aggregate([
        {
            $group: {
                _id: '$postId',
                likeCount: { $sum: 1 }
            }
        }
    ])

    await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                totalLikes: likeCounts[0]?.likeCount
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, {}, "Like added successfully"))
})

const removeLike = asyncHandler(async (req, res) => {
    const { blogId } = req.body
    const userId = req.user?._id

    if (!blogId || !userId) throw new ApiError(400, "Invalid request")

    const prevLike = await Like.findOne({ likedByUser: userId, postId: blogId })

    if (!prevLike) throw new ApiError(402, "User not liked")

    await Like.findByIdAndDelete(prevLike._id)

    const likeCounts = await Like.aggregate([
        {
            $group: {
                _id: '$postId',
                likeCount: { $sum: 1 }
            }
        }
    ])

    await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                totalLikes: likeCounts[0]?.likeCount
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, {}, "Like removed successfully"))
})

const checkLike = asyncHandler(async (req, res) => {
    const { blogId } = req?.params
    const userId = req?.user?._id
    if (!blogId || !userId) throw new ApiError(400, "Invalid request")

    const prevLiked = await Like.findOne({ likedByUser: userId, postId: blogId })

    return res.status(200)
        .json(new ApiResponse(200, { isLiked: prevLiked ? true : false }, "Like fetched successfully"))
})

export {
    createLike,
    removeLike,
    checkLike
}