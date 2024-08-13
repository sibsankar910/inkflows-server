import { Router } from "express";
import { checkFollow, createFollow, removeFollow } from "../controllers/follow.controller.js";
import { authenticateUser, getAuthenticatedUser, registerAuthenticatedUser } from "../controllers/googleAuth.controller.js";
import {
    checkUserAuthenticated,
    getCurrentUser,
    getUserById,
    getUserByUserName,
    getUserList,
    getUserNameList,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAvatar,
    updatePassword,
    updateUser
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route('/create-user').post(upload.fields([{ name: 'avatar', maxCount: 1 }]), registerUser);
router.route('/login-user').post(loginUser)
router.route('/logout-user').get(verifyJwt, logoutUser)
router.route('/check-auth').get(verifyJwt, checkUserAuthenticated)
router.route('/refresh-token').get(refreshAccessToken)

// Google auth routes
router.route('/google-login').get(authenticateUser)
router.route('/google-login/callback').get(registerAuthenticatedUser)
router.route('/google-login/auth-user').get(getAuthenticatedUser)

router.route('/update-user').patch(verifyJwt, updateUser)
router.route('/update-avatar').patch(verifyJwt, upload.single('avatar'), updateAvatar)
router.route('/update-password').patch(verifyJwt, updatePassword)

router.route('/get-userlist').get(getUserList)
router.route('/get-usernamelist').get(getUserNameList)

router.route('/get-by-name/:userName').get(getUserByUserName)
router.route('/get-by-id/:userId').get(getUserById)
router.route('/current-user').get(verifyJwt, getCurrentUser)

// Follow user routes
router.route('/create-follow').post(verifyJwt, createFollow)
router.route('/remove-follow').post(verifyJwt, removeFollow)
router.route('/check-follow/:followingTo').get(verifyJwt, checkFollow)

export default router;