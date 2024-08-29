import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema({
    creator: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
        required: true
    },
    blogTitle: {
        type: String,
        required: true
    },
    contentList: {
        type: Array,
        required: true
    },
    blogCategories: {
        type: Array
    },
    thumbnail: {
        type: String
    },
    tagList: {
        type: Array
    },
    uploadStatus: {
        type: String,
        default: "draft",
        required: true
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    totalViews: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

export const Blog = mongoose.model('Blog', blogSchema)