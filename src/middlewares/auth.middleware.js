import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"

export const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken
        if (!token) throw new ApiError(401, "Unauthorised Request")
        const verifiedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(verifiedToken._id).select("-password -refreshToken")
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(500, "Unable to verify token")
    }
})