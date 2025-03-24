import mongoose, { Schema } from "mongoose";

const contributionSchema = new Schema({
    blogId: {
        type: mongoose.Types.ObjectId,
        ref: "Blogs",
        required: true
    },
    blogDetails: {
        type: Object
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    isRespond: {
        type: Boolean,
        default: true
    },
    isAccepted: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

export const Contribution = mongoose.model("Contributor", contributionSchema)