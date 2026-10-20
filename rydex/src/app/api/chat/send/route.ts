import { auth } from "@/auth";
import connectDb from "@/lib/db";
import ChatMessage from "@/models/chatMessage.model";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat/send
 * C8: Auth required. Sender is taken from session (never from client).
 * Ownership verified: only the user or driver of the booking may send messages.
 */
export async function POST(req: NextRequest) {
    try {
        await connectDb()

        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const { bookingId, text } = await req.json()
        if (!bookingId || !text?.trim()) {
            return NextResponse.json({ message: "bookingId and text are required" }, { status: 400 })
        }

        const booking = await Booking.findById(bookingId)
        if (!booking) {
            return NextResponse.json({ message: "booking not found" }, { status: 404 })
        }

        // C8: Verify caller is the user or driver of this booking
        const user = await User.findOne({ email: session.user.email })
        if (!user) {
            return NextResponse.json({ message: "user not found" }, { status: 404 })
        }

        const isOwner = booking.user.toString() === user._id.toString()
        const isDriver = booking.driver.toString() === user._id.toString()

        if (!isOwner && !isDriver) {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        const role = isOwner ? "user" : "driver"

        const msg = await ChatMessage.create({
            bookingId,
            sender: role,
            text: text.trim()
        })

        return NextResponse.json(msg, { status: 200 })

    } catch (error) {
        console.error("[chat/send] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "send message error" }, { status: 500 })
    }
}