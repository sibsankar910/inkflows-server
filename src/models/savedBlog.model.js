import mongoose, { Schema } from "mongoose";

const savedBlogSchema = new Schema({
    blogId: {
        type: mongoose.Types.ObjectId,
        ref: "Blogs",
        required: true
    },
    savedBy: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
        required: true
    }
}, {timestamps: true})

export const SavedBlog = mongoose.model("SavedBlog", savedBlogSchema)