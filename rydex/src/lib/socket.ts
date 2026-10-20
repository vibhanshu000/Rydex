import { io, Socket } from "socket.io-client"

let socket: Socket | null = null
let currentUserId: string | null = null

export const getSocket = () => {
    if (!socket) {
        const url = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:8000"
        socket = io(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        })

        socket.on("connect", () => {
            console.log("[socket] Connected with id:", socket?.id)
            if (currentUserId && socket) {
                socket.emit("identity", currentUserId)
            }
        })
    }
    return socket
}

export const setSocketIdentity = (userId: string | any) => {
    if (!userId) return
    const idStr = String(userId?._id || userId)
    currentUserId = idStr
    const s = getSocket()
    if (s.connected) {
        s.emit("identity", idStr)
    }
}
