import { Blog } from "../models/blog.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadOnFireBase } from "../utils/firebase-connects.js";
import { View } from "../models/views.model.js";
import { SavedBlog } from "../models/savedBlog.model.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const createBlog = asyncHandler(async (req, res) => {
    const { blogTitle, contentList, creator, thumbnail } = req.body

    if (!blogTitle || !contentList) throw new ApiError(400, "Title and content is required")

    const blog = await Blog.create({
        creator: req.user?._id || creator,
        blogTitle,
        contentList,
        thumbnail
    })

    return res.status(200)
        .json(new ApiResponse(200, blog, "Blog created successfully"))
})

const uploadImageOnCloud = asyncHandler(async (req, res) => {
    const imagePath = req.file?.path
    if (!imagePath) throw new ApiError(400, "Image is required")

    const image = await uploadOnFireBase(imagePath)

    return res.status(200)
        .json(new ApiResponse(200, { imageUrl: image.url }, "Image uploaded on cloud"))
})

const updateTagList = asyncHandler(async (req, res) => {
    const { blogId, tagList } = req.body
    if (!tagList || !blogId) throw new ApiError(400, "All fields are required")

    const blog = await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                tagList: tagList
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, blog, "Taglist updated"))
})

const updateThumbnail = asyncHandler(async (req, res) => {
    const { blogId, thumbnail } = req.body
    if (!thumbnail || !blogId) throw new ApiError(400, "All fields are required")

    const blog = await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                thumbnail: thumbnail
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, blog, "Thumbnail updated"))
})

const updateBlog = asyncHandler(async (req, res) => {
    const { blogTitle, contentList, blogId } = req.body
    if (!blogId) throw new ApiError(400, "Blog id is required")


    const blog = await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                blogTitle,
                contentList
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, blog, "Blog updated"))
})

const updateBlogUploadStatus = asyncHandler(async (req, res) => {
    const { status, blogId } = req.body
    if (!blogId || !status) throw new ApiError(400, "All fields are required")


    const blog = await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                uploadStatus: status
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, blog, "Blog status updated"))
})

const getBlog = asyncHandler(async (req, res) => {
    const { blogId } = req.params
    if (!blogId) throw new ApiError(400, "Blog Id is required")

    const blog = await Blog.findById(blogId)
    if (!blog) throw new ApiError(402, "Blog does not exist")

    return res.status(200)
        .json(new ApiResponse(200, blog, "Blog fetched successfully"))
})

const getBlogList = asyncHandler(async (req, res) => {
    const blogList = await Blog.aggregate([
        {
            $match: {
                uploadStatus: "public"
            }
        },
        {
            $project: {
                _id: 1,
                creator: 1,
                blogTitle: 1,
                thumbnail: 1,
                totalViews: 1,
                totalLikes: 1,
                uploadStatus: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, blogList, "Bloglist fetched fuccessfully"))
})

// Create blog list for particulars
const getUserBlogList = asyncHandler(async (req, res) => {
    const { userName, blogType } = req.query
    if (!userName || !blogType) throw new ApiError(400, "Incomplete request")

    const user = await User.findOne({ userName: userName })
    if (!user) throw new ApiError(400, "User does not exist")

    const blogList = await Blog.aggregate([
        {
            $match: {
                creator: user?._id,
                uploadStatus: blogType
            }
        },
        {
            $project: {
                _id: 1,
                creator: 1,
                blogTitle: 1,
                thumbnail: 1,
                totalViews: 1,
                totalLikes: 1,
                uploadStatus: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, blogList, "Blog list fetched successfully"))
})

const getDraftAndPublicBlogNum = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId) throw new ApiResponse(400, "user id is required")
    const draftBlogList = await Blog.aggregate([
        {
            $match: {
                creator: new mongoose.Types.ObjectId(userId),
                uploadStatus: 'draft'
            }
        }
    ])
    const publicBlogList = await Blog.aggregate([
        {
            $match: {
                creator: new mongoose.Types.ObjectId(userId),
                uploadStatus: 'public'
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, { draftBlogCount: draftBlogList?.length || 0, publicBlogCount: publicBlogList?.length || 0 }, "Blog number fetched successfully"))
})

const getAllTags = asyncHandler(async (req, res) => {
    const tags = await Blog.aggregate([
        { $unwind: "$tagList" },        // Unwind the tagList array
        { $group: { _id: "$tagList" } }, // Group by each tag
        { $project: { _id: 0, tag: "$_id" } }, // Project the tag as a field
        { $sort: { tag: 1 } }
    ]);

    return res.status(200)
        .json(new ApiResponse(200, tags?.map(tagObj => tagObj.tag), "Taglist fetched"))
})

// Add new view to the blog
const addViews = asyncHandler(async (req, res) => {
    const { blogId, uniqueId } = req.body
    const userId = req.user?._id

    if (userId === uniqueId && !uniqueId) throw new ApiError(400, "Unique id is not valid")

    if (!userId || !blogId) throw new ApiError(400, "User and Blog id is required")

    const prevViewed = await View.findOne({ postId: blogId, viewedBy: userId })

    if (prevViewed) throw new ApiError(400, "User already viewed it")

    await View.create({
        postId: blogId,
        viewedBy: userId
    })

    const viewsCounts = await View.aggregate([
        {
            $group: {
                _id: "$postId",
                viewsCount: { $sum: 1 }
            }
        }
    ])

    await Blog.findByIdAndUpdate(blogId,
        {
            $set: {
                totalViews: viewsCounts[0]?.viewsCount
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, {}, "Views added successfully"))

})

// Get saved blog list
const addToSaveList = asyncHandler(async (req, res) => {
    const { blogId } = req.params
    const userId = req.user?._id
    if (!blogId || !userId) new ApiError(400, 'Invalid request')

    const prevSaved = await SavedBlog.findOne({ savedBy: userId, blogId: blogId })
    if (prevSaved) throw new ApiError(402, "Blog is already added to save list")

    await SavedBlog.create({
        blogId,
        savedBy: userId
    })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Blog added to save list"))
})

const removeFromSaveList = asyncHandler(async (req, res) => {
    const { blogId } = req.params
    const userId = req.user?._id
    if (!blogId || !userId) new ApiError(400, 'Invalid request')

    const prevSaved = await SavedBlog.findOne({ savedBy: userId, blogId: blogId })
    if (!prevSaved) throw new ApiError(402, "Blog is not added to save list")

    await SavedBlog.findByIdAndDelete(prevSaved._id)

    return res.status(200)
        .json(new ApiResponse(200, {}, "Blog removed from save list"))
})

const getSavedBlogsIdList = asyncHandler(async (req, res) => {
    const userId = req?.user?._id

    const savedPosts = await SavedBlog.aggregate([
        {
            $match: { savedBy: new mongoose.Types.ObjectId(userId) }
        },
        {
            $group: {
                _id: '$savedBy',
                blogIdList: { $push: '$blogId' }
            }
        },
        {
            $project: {
                _id: 0,
                blogIdList: 1
            }
        }
    ]);

    return res.status(200)
        .json(new ApiResponse(200, savedPosts?.length > 0 && savedPosts[0], "Saved blog id list fetched"))
})

const getSavedBlogList = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    if (!userId) new ApiError(401, "Unauthorised request")

    const savedPosts = await SavedBlog.aggregate([
        {
            $match: { savedBy: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: 'blogs',
                localField: 'blogId',
                foreignField: '_id',
                as: 'blogDetails'
            }
        },
        {
            $unwind: '$blogDetails'
        },
        {
            $project: {
                blogDetails: {
                    contentList: 0 // Exclude the contentList field
                }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                blogs: { $push: "$blogDetails" }
            }
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                blogs: 1
            }
        },
        {
            $sort: { date: 1 } // Sort by date ascending
        }
    ]);

    return res.status(200)
        .json(new ApiResponse(200, savedPosts, "Saved list created successfully"))
})

export {
    createBlog,
    uploadImageOnCloud,
    updateTagList,
    updateThumbnail,
    updateBlog,
    updateBlogUploadStatus,
    getBlog,
    getBlogList,
    getUserBlogList,
    getDraftAndPublicBlogNum,
    getAllTags,
    addViews,
    getSavedBlogList,
    getSavedBlogsIdList,
    addToSaveList,
    removeFromSaveList
}