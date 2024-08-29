import mongoose, { Schema } from "mongoose";

const viewSchema = new Schema({
    postId: {
        type: mongoose.Types.ObjectId,
        ref: "Blogs",
        required: true
    },
    viewedBy: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
        required: true
    },
    repetition:{
        type: Number,
        default: 0
    }
}, {timestamps: true})

export const View = mongoose.model("View", viewSchema)