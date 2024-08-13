import mongoose, { Schema } from "mongoose";

const followSchema = new Schema(
    {
        followingTo: {
            type: mongoose.Types.ObjectId,
            ref: "Users",
            required: true
        },
        followedBy: {
            type: mongoose.Types.ObjectId,
            ref: "Users",
            required: true
        }
    }, { timestamps: true }
)

export const Follow = mongoose.model("Follow", followSchema)