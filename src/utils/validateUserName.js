import axios from "axios";

function containsForbiddenWords(username) {
    const forbiddenWords = [
        "admin", "root", "system",
        "select", "drop", "insert", "delete",
        "<script>", "alert", "kill", "suicide",
        "murder", "nazi", "klan",
        "f***", "s***", "b****", "c***",
        "a******", "p***", "d***", "sex",
        "porn", "xxx", "@example.com"
    ];

    // Normalize the username to lower case for case-insensitive comparison
    const lowerUsername = username?.toLowerCase();

    for (let word of forbiddenWords) {
        if (lowerUsername?.includes(word)) {
            return true;
        }
    }

    return false;
}

export async function validateUsername(username) {
    const regex = /^[a-zA-Z0-9._-]{3,20}$/;
    let isNameUseable = true, status = 200

    if (!regex.test(username) || containsForbiddenWords(username)) {
        isNameUseable = false
        status = 401
    } else {
        isNameUseable = true
        status = 200
    }

    // check for useravailable or not
    let isUserAvailable = true
    try {
        const res = await axios.get('/user/get-usernamelist')
        const list = res.data?.data;
        if (list?.includes(username)) {
            isUserAvailable = false;
            status = 402;
        } else {
            isUserAvailable = true;
            status = 200;
        }
    } catch (error) {
        console.log(error);
    }

    let isUserValidate = true
    if (!isNameUseable || !isUserAvailable) {
        isUserValidate = false
    } else {
        isUserValidate = true
    }

    return { status, isUserValidate }
}