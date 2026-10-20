import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
dotenv.config()
const port = process.env.PORT || 5000
const mongodbUrl=process.env.MONGODB_URL || process.env.MONGODB_URI
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import User from "./models/user.model.js"
const connectDb=async () => {
    try {
        await mongoose.connect(mongodbUrl)
        console.log("db connected")
    } catch (error) {
        console.log("db error")
    }
}

const app=express()

const allowedOrigins = process.env.NEXT_BASE_URL
    ? [process.env.NEXT_BASE_URL, process.env.NEXT_BASE_URL.replace(/\/$/, "")]
    : "*"

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())
const server=http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
})

app.post("/emit", async (req, res) => {
    const { event, userId, data } = req.body
    try {
        if (!event || !userId) {
            return res.status(400).json({ success: false, message: "event and userId are required" })
        }

        const targetId = String(typeof userId === "object" && userId?._id ? userId._id : userId)

        // 1. Immediate broadcast to user room (instantly reaches all tabs for this user)
        io.to(`user-${targetId}`).emit(event, data)

        // 2. Broadcast to ride room if data has bookingId or _id
        const rideId = data?.bookingId || (data?._id ? data._id : null)
        if (rideId) {
            io.to(`ride-${rideId}`).emit(event, data)
        }

        // 3. Also emit to specific socketId if found in DB
        try {
            const user = await User.findById(targetId)
            if (user && user.socketId) {
                io.to(user.socketId).emit(event, data)
            }
        } catch (dbErr) {
            console.warn("[socketServer /emit] DB lookup warning:", dbErr instanceof Error ? dbErr.message : dbErr)
        }

        return res.json({ success: true })
    } catch (error) {
        console.error("[socketServer /emit] Error:", error instanceof Error ? error.message : error)
        return res.status(500).json({ success: false })
    }
})

io.on("connection", (socket) => {

    socket.on("identity", async (userId) => {
        try {
            if (!userId) return
            const targetId = String(typeof userId === "object" && userId?._id ? userId._id : userId)
            socket.userId = targetId
            socket.join(`user-${targetId}`)
            await User.findByIdAndUpdate(targetId, {
                socketId: socket.id,
                isOnline: true
            })
        } catch (err) {
            console.error("[socket identity] Error:", err instanceof Error ? err.message : err)
        }
    })

    socket.on("update-location", async (payload) => {
        try {
            if (!payload) return
            const { userId, latitude, longitude } = payload
            if (!userId || latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) return
            const targetId = typeof userId === "object" && userId?._id ? userId._id : userId
            await User.findByIdAndUpdate(targetId, {
                location: {
                    type: "Point",
                    coordinates: [Number(longitude), Number(latitude)]
                }
            })
        } catch (err) {
            console.error("[socket update-location] Error:", err instanceof Error ? err.message : err)
        }
    })

    socket.on("join-ride", (bookingId) => {
        try {
            if (!bookingId) return
            const id = typeof bookingId === "object" && bookingId?._id ? bookingId._id : bookingId
            socket.join(`ride-${id}`)
        } catch (err) {
            console.error("[socket join-ride] Error:", err instanceof Error ? err.message : err)
        }
    })

    socket.on("driver-location-update", (payload) => {
        try {
            if (!payload || !payload.bookingId) return
            const { bookingId, latitude, longitude } = payload
            io.to(`ride-${bookingId}`).emit("driver-location", {
                latitude,
                longitude
            })
        } catch (err) {
            console.error("[socket driver-location-update] Error:", err instanceof Error ? err.message : err)
        }
    })

    socket.on("chat-message", (data) => {
        try {
            if (!data) return
            const bId = data.bookingId || data?.message?.bookingId
            if (!bId) return
            io.to(`ride-${bId}`).emit("chat-message", data)
        } catch (err) {
            console.error("[socket chat-message] Error:", err instanceof Error ? err.message : err)
        }
    })

    socket.on("disconnect", async () => {
        try {
            if (!socket.userId) return
            await User.findByIdAndUpdate(socket.userId, {
                socketId: null,
                isOnline: false
            })
        } catch (err) {
            console.error("[socket disconnect] Error:", err instanceof Error ? err.message : err)
        }
    })

})




server.listen(port,()=>{
    console.log("server started")
    connectDb()
})
