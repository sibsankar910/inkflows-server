import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js"
import { deleteFromFirebase, uploadOnFireBase } from "../utils/firebase-connects.js";
import mongoose from "mongoose";
import { Blog } from "../models/blog.model.js";
import jwt from "jsonwebtoken"

const registerUser = asyncHandler(async (req, res) => {

    const { email, password, userName, fullName, authBy } = req.body

    if (
        [email, userName, fullName].some(f => f?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    if (authBy === 'email' && !password) throw new ApiError(400, "Password is required")

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (existedUser) {
        throw new ApiError(401, "User already exist")
    }


    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }

    const avatar = await uploadOnFireBase(avatarLocalPath)

    const user = await User.create({
        fullName,
        userName,
        email,
        password,
        avatar: avatar?.url || ""
    })

    const createdUser = await User.findById(user._id).select(       // Removes from db
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong during registration")
    }

    return res.status(200).json(
        new ApiResponse(200, createdUser, "user Registered successfuly")
    )
})

const getAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        if (!accessToken) throw new ApiError(401, "Token Expired")
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Server Error on generating tokens")
    }
}

const loginUser = asyncHandler(async (req, res) => {
    const { email, password, loginId } = req.body
    if (!email) throw new ApiError(400, "email is required")

    const user = await User.findOne({
        email: email
    })
    if (!user) throw new ApiError(403, "User not found");

    if (user.authBy === "email") {
        if (!password) throw new ApiError(400, "Password is required")

        const checkPassword = await user.isPasswordCorrect(password)

        if (!checkPassword) throw new ApiError(402, "Password is incorrect")
    }

    if (user.authBy === "google" && !loginId) throw new ApiError(400, "Google login Id is required")

    const { accessToken, refreshToken } = await getAccessAndRefreshToken(user._id)

    const expiresInDays = parseInt(process.env.LOG_COOKIE_EXPIRY, 10);
    const expiresDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const cookieOptions = {
        // httpOnly: true,
        secure: true,
        expires: expiresDate

    }
    return (
        res.status(200)
            .cookie('accessToken', accessToken, cookieOptions)
            .cookie('refreshToken', refreshToken, cookieOptions)
            .json(new ApiResponse(200, {}, "User loggedin successfully"))
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const cookieOptions = {
        // httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
        .json(new ApiResponse(200, {}, "User loggedout successfully"))
})

const checkUserAuthenticated = asyncHandler(async (req, res) => {
    const userId = req?.user?._id

    const isAuthenticated = userId ? true : false

    return res.status(200)
        .json(new ApiResponse(200, { isAuthenticated }, "Authentication checked"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(400, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, 'Invalid refresh token')
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired')
        }

        const expiresInDays = parseInt(process.env.LOG_COOKIE_EXPIRY, 10);
        const expiresDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        const options = {
            // httpOnly: true,
            secure: true,
            expires: expiresDate
        }

        const { accessToken, newRefreshToken } = await getAccessAndRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie('refreshToken', newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, {}, "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }


})

const updateUser = asyncHandler(async (req, res) => {
    const { fullName, userName } = req.body

    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                userName
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, {}, "Username updated"))
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path

    if (!avatarFile) throw new ApiError(400, "Avatar is required")

    const user = await User.findById(req.user?._id).select('-password -refreshToken')

    const newAvatar = await uploadOnFireBase(avatarFile)

    // removes old avatar from firebase cloud
    if (user?.avatar) {
        await deleteFromFirebase(user?.avatar)
    }

    // updates new Avatar
    user.avatar = newAvatar?.url
    await user.save({ validateBeforeSave: false })

    res.status(200)
        .json(new ApiResponse(200, {}, "Avatar updated successfully"))
})

const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) throw new ApiError(400, "All fields are required")
    const user = await User.findById(req.user?._id)

    if (user?.authBy !== "email") throw new ApiError(400, "Only email authenticates can change password")

    // verifies current password
    const verifyCurrentPassword = await user.isPasswordCorrect(currentPassword)
    if (!verifyCurrentPassword) throw new ApiError(402, "Correct password is required")

    // updates new password
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password updated"))
})

const getUserByUserName = asyncHandler(async (req, res) => {
    const { userName } = req.params
    if (!userName) throw new ApiError(400, 'Username is required')

    const user = await User.findOne({ userName: userName }).select("-password -refreshToken")
    if (!user) throw new ApiError(402, "User does not exist")

    return res.status(200)
        .json(new ApiResponse(200, user, "User fetched successfully"))
})

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId) throw new ApiError(400, 'UserId is required')

    const user = await User.findById(userId).select("-password -refreshToken")
    if (!user) throw new ApiError(401, "User does not exist")

    return res.status(200)
        .json(new ApiResponse(200, user, "User fetched successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    if (!userId) throw new ApiError(401, 'Un authorised')

    const user = await User.findById(userId).select("-password -refreshToken")
    if (!user) throw new ApiError(401, "User does not exist")

    return res.status(200)
        .json(new ApiResponse(200, user, "User fetched successfully"))
})

const getUserList = asyncHandler(async (req, res) => {
    const userList = await User.aggregate([
        {
            $project: {
                _id: 1,
                userName: 1,
                fullName: 1,
                avatar: 1,
                email: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, userList, "User list fetched successfully"))
})

const getUserNameList = asyncHandler(async (req, res) => {
    const userNameList = await User.aggregate([
        {
            $group: {
                _id: null,
                userNames: { $push: "$userName" }
            }
        },
        {
            $project: {
                _id: 0,
                userNames: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, userNameList[0]?.userNames, "Username list fetched"))
})

// get bloglist created by user
const getPublicBlogList = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    if (!userId) throw new ApiError(401, "Invalid request")
    const publicBlogList = await Blog.aggregate([
        {
            $match: {
                creator: new mongoose.Types.ObjectId(userId),
                uploadStatus: "public"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                creator: 1,
                blogTitle: 1,
                thumbnail: 1,
                totalLikes: 1,
                totalViews: 1,
                uploadStatus: 1,
                createdAt: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, publicBlogList, "User public bloglist fetched successfully"))
})

const getDraftBlogList = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    if (!userId) throw new ApiError(401, "Invalid request")
    const publicBlogList = await Blog.aggregate([
        {
            $match: {
                creator: new mongoose.Types.ObjectId(userId),
                uploadStatus: "draft"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                creator: 1,
                blogTitle: 1,
                thumbnail: 1,
                totalLikes: 1,
                totalViews: 1,
                uploadStatus: 1,
                createdAt: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, publicBlogList, "User drafted bloglist fetched successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    checkUserAuthenticated,
    refreshAccessToken,
    updateUser,
    updateAvatar,
    updatePassword,
    getUserByUserName,
    getUserById,
    getCurrentUser,
    getUserList,
    getUserNameList,
    getPublicBlogList,
    getDraftBlogList
}