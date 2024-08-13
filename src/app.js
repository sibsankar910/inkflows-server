import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: [process.env.CORS_ORIGIN, "http://192.168.22.113:3000"],
    credentials: true
}))
app.use(cookieParser())
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))

// Routes
import userRouter from "./routes/user.routes.js"
import blogRouter from "./routes/blog.routes.js"

app.use('/api/v1/user', userRouter)
app.use('/api/v1/blog', blogRouter)

export { app }