import { Blog } from "../models/blog.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const verifyBlogCreator = asyncHandler(async (req, res, next) => {
    try {
        const { blogId } = req.body;
        if (!blogId) throw new ApiError(400, "Blog id is required")
        const blog = await Blog.findById(blogId)
        if (!blog) throw new ApiError(402, "Blog not found")

        const userId = req.user?._id
        if (!userId) throw new ApiError(401, "User not authorised")

        if (blog?.creator?.toString() === userId?.toString()) {
            next()
        } else {
            throw new ApiError(401, "User can not edit this blog")
        }
    } catch (error) {
        throw new ApiError(500, "Server error")
    }
})