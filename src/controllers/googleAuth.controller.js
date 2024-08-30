import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateUsername } from "../utils/validateUserName.js";

const clientId = process.env.OAUTH_CLIENT_ID
const clientSecret = process.env.OAUTH_CLIENT_SECRET
const redirectUri = `${process.env.CURRENT_ORIGIN}/api/v1/user/google-login/callback`

const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri)

const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
];

const authenticateUser = asyncHandler(async (req, res) => {
    const authorisedUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes
    })

    res.redirect(authorisedUrl)
})

const registerAuthenticatedUser = asyncHandler(async (req, res) => {
    const code = req.query.code

    const { tokens } = await oAuth2Client.getToken(code);

    if (!tokens) throw new ApiError(500, "Can not get tokens right now")
    oAuth2Client.setCredentials(tokens);

    const userinfoResponse = await oAuth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });

    const userinfo = userinfoResponse.data;

    if (!userinfo) throw new ApiError(500, "Unable to get user")

    try {

        const existedUser = await User.findOne({ email: userinfo?.email })

        if (!existedUser) {
            // validate user name 
            let userName = userinfo.email?.match(/^[^@]+/)[0];

            for (let i = 0; i <= 100; i++) {
                let { status, isUserValidate } = await validateUsername(userName)
                if (isUserValidate) {
                    break;
                } else {
                    userName = `${userName}${i}`
                }
            }

            // creates new user
            await User.create({
                email: userinfo.email,
                fullName: userinfo.name,
                userName: userName,
                authBy: "google",
                avatar: userinfo.picture || "",
                loginId: userinfo.id,
                password: userinfo.id
            })
        }

    } catch (error) {
        return res.redirect(`${process.env.CORS_ORIGIN}/auth/login`)
    }

    const expiresInDays = parseInt(process.env.LOG_COOKIE_EXPIRY, 10);
    const expiresDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const cookieOptions = {
        httpOnly: true,
        expires: expiresDate,
        secure: true,
        sameSite: 'none',
        origin: process.env.CORS_ORIGIN,
        path: '/'
    }
    return res.status(200)
        .cookie('authToken', tokens?.access_token || '', cookieOptions)
        .redirect(`${process.env.CORS_ORIGIN}/auth/login?token=${tokens?.access_token}`)
})

const getAuthenticatedUser = asyncHandler(async (req, res) => {
    const token = req.cookies?.authToken
    if (!token) throw new ApiError(500, "Can not get tokens");
    // Fetch userdata
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })


    return res.status(200)
        .json(new ApiResponse(200, response?.data, "User fetched sucessfully"))
})

export {
    authenticateUser,
    registerAuthenticatedUser,
    getAuthenticatedUser
}