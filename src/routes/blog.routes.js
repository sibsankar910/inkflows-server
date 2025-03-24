import { Router } from "express";
import {
    addToSaveList,
    addViews,
    createBlog, createBlogContribution, getAllTags, getBlog, getBlogList, getContributionList, getContributorList, getDraftAndPublicBlogNum, getRecomSearch, getSavedBlogList, getSavedBlogsIdList, getSearchResult, getUserAuthBlog, getUserBlogList, removeContribution, removeFromSaveList, setContributionResponse, updateBlog, updateBlogUploadStatus, updateTagList, updateThumbnail, uploadImageOnCloud
} from "../controllers/blog.controller.js";
import { checkLike, createLike, removeLike } from "../controllers/like.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyBlogCreator } from "../middlewares/authBlogEdit.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route('/create-blog').post(verifyJwt, createBlog)

router.route('/upload-image').post(upload.single('image'), uploadImageOnCloud)

router.route('/update-tags').patch(verifyJwt, verifyBlogCreator, updateTagList)
router.route('/update-tnail').patch(verifyJwt, verifyBlogCreator, updateThumbnail)
router.route('/update-blog').patch(verifyJwt, verifyBlogCreator, updateBlog)
router.route('/upload-status').patch(verifyJwt, verifyBlogCreator, updateBlogUploadStatus)

router.route('/add-contributor').post(verifyJwt, createBlogContribution)
router.route('/contributor-response').patch(verifyJwt, setContributionResponse)
router.route('/remove-contribution/:contributionId').patch(verifyJwt, removeContribution);

router.route('/get-blog/:blogId').get(getBlog)
router.route('/get-auth-blog/:blogId').get(verifyJwt, verifyBlogCreator, getUserAuthBlog)
router.route('/get-bloglist').get(getBlogList)
router.route('/get-taglist').get(getAllTags)

router.route('/user-bloglist').get(getUserBlogList)
router.route('/get-blognumber/:userId').get(getDraftAndPublicBlogNum)
router.route('/get-contribution-list').get(verifyJwt, getContributionList);
router.route('/contributor-list/:blogId').get(verifyJwt, getContributorList);

// Views routes
router.route('/add-views').post(verifyJwt, addViews)

// Like routes
router.route('/create-like').post(verifyJwt, createLike)
router.route('/remove-like').post(verifyJwt, removeLike)
router.route('/check-like/:blogId').get(verifyJwt, checkLike)

// SavedBlog list
router.route('/add-savelist/:blogId').post(verifyJwt, addToSaveList)
router.route('/remove-savelist/:blogId').post(verifyJwt, removeFromSaveList)
router.route('/savedblog-list').get(verifyJwt, getSavedBlogList)
router.route('/savedblogId-list').get(verifyJwt, getSavedBlogsIdList)

// blog search
router.route("/search").get(getSearchResult)
router.route("/recom-search").get(getRecomSearch);

export default router;