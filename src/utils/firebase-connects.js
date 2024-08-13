import admin from "firebase-admin"
import { createRequire } from 'module';
import path from "path";
import mime from "mime-types"
import { ApiError } from "../utils/api-error.js"
import fs from "fs"

const require = createRequire(import.meta.url);
const serviceAccount = require('../../firebaseServiceKey.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'inkflows-cloud.appspot.com'
})

const bucket = admin.storage().bucket()

const uploadOnFireBase = async (localFilePath) => {
    if (!localFilePath) return null
    try {
        const fileName = path.basename(localFilePath);
        const contentType = mime.lookup(fileName);

        await bucket.upload(localFilePath, {
            metadata: {
                contentType: contentType
            }
        })
        const file = bucket.file(fileName)
        const [metadata] = await file.getMetadata()
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        })
        // Remove temp image
        fs.unlinkSync(localFilePath)
        return {
            url,
            metadata
        }
    } catch (error) {
        fs.unlinkSync(localFilePath)
        throw new ApiError(401, "Unable to upload image")
    }
}

function getFilePathFromUrl(url) {
    const decodedUrl = decodeURIComponent(url);
    const baseUrl = process.env.FIREBASE_BASE_URL;
    return decodedUrl.replace(baseUrl, '').split('?')[0];
}

const deleteFromFirebase = async (url) => {
    const filePath = getFilePathFromUrl(url)
    bucket.file(filePath).delete()
        .catch(error => {
            console.log(error);
        })
}

export { uploadOnFireBase, deleteFromFirebase }