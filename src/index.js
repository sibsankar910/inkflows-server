import { app } from "./app.js";
import dotenv from "dotenv"
import { connectDb } from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDb()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server is listening on port - ${process.env.PORT}`)
        })
    })