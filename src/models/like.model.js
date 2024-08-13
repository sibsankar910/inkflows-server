import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    postId: {
        type: mongoose.Types.ObjectId,
        ref: "Blogs",
        required: true
    },
    likedByUser: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
        required: true
    }
}, {timestamps: true})

export const Like = mongoose.model("Like", likeSchema)