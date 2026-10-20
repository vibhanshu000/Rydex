import { auth } from "@/auth";
import connectDb from "@/lib/db";
import ChatMessage from "@/models/chatMessage.model";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat/get-all
 * C8: Auth required. Only the user or driver of the booking may read its messages.
 */
export async function POST(req: NextRequest) {
    try {
        await connectDb()

        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const { bookingId } = await req.json()
        if (!bookingId) {
            return NextResponse.json({ message: "bookingId is required" }, { status: 400 })
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

        const msgs = await ChatMessage.find({ bookingId }).sort({ createdAt: 1 })

        return NextResponse.json(msgs, { status: 200 })

    } catch (error) {
        console.error("[chat/get-all] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "get all messages error" }, { status: 500 })
    }
}