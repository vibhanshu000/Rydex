import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { generateKitTokenForServer } from "@/lib/zegoToken";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/video-kyc/token
 *
 * Secure server-side Zego token generation for video KYC rooms.
 *
 * Security guarantees:
 *  - Session is read server-side (cannot be tampered from the browser)
 *  - Room ownership is verified in the DB before issuing a token
 *  - ZEGO_SERVER_SECRET never leaves the server (not NEXT_PUBLIC_)
 *  - Partners can only join the room assigned to them
 *  - Admins can only join rooms that are actively in_progress
 *  - All other roles are rejected with 403
 *  - Uses Node.js crypto only — no browser APIs (no `document` reference)
 */
export async function POST(req: NextRequest) {
    try {
        await connectDb()

        const session = await auth()
        if (!session?.user?.email || !session.user.id) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const { roomId } = await req.json()
        if (!roomId || typeof roomId !== "string") {
            return NextResponse.json({ message: "roomId is required" }, { status: 400 })
        }

        const role = session.user.role
        const userId = session.user.id
        const userEmail = session.user.email
        const userName = session.user.name

        if (role === "partner") {
            // Partners may only join the specific room that was assigned to them
            const partner = await User.findOne({
                _id: userId,
                role: "partner",
                videoKycRoomId: roomId,
                videoKycStatus: "in_progress",
            })

            if (!partner) {
                return NextResponse.json(
                    { message: "Access denied: this room is not assigned to you or is not currently active." },
                    { status: 403 }
                )
            }
        } else if (role === "admin") {
            // Admins may join any active KYC room
            const activeRoom = await User.findOne({
                videoKycRoomId: roomId,
                role: "partner",
                videoKycStatus: "in_progress",
            })

            if (!activeRoom) {
                return NextResponse.json(
                    { message: "Access denied: no active KYC session found for this room." },
                    { status: 403 }
                )
            }
        } else {
            // Regular users have no access to KYC rooms
            return NextResponse.json(
                { message: "Access denied: only admins and partners may join KYC calls." },
                { status: 403 }
            )
        }

        // Build a role-prefixed userId so Zego always sees two distinct participants
        const zegoUserId = `${role}_${userId}`
        const displayName =
            role === "admin" ? "Admin" : `${userName ?? "Partner"} (${userEmail})`

        const appId = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID)
        const serverSecret = process.env.ZEGO_SERVER_SECRET

        if (!appId || !serverSecret) {
            console.error("[video-kyc/token] Missing Zego environment variables")
            return NextResponse.json(
                { message: "Server configuration error" },
                { status: 500 }
            )
        }

        // generateKitTokenForServer uses Node.js crypto only — no browser APIs
        const token = generateKitTokenForServer(
            appId,
            serverSecret,
            roomId,
            zegoUserId,
            displayName
        )

        return NextResponse.json({ token, userId: zegoUserId, displayName, role })
    } catch (error) {
        console.error("[video-kyc/token] Error:", error)
        return NextResponse.json({ message: "token generation error" }, { status: 500 })
    }
}
