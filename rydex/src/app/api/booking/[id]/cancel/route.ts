import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/booking/[id]/cancel
 * C4: Cancels a booking. Only the user who created the booking may cancel it.
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDb()

        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 })
        }

        const id = (await context.params).id
        const booking = await Booking.findById(id)

        if (!booking) {
            return NextResponse.json({ success: false, message: "booking not found" }, { status: 404 })
        }

        if (!["requested", "awaiting_payment"].includes(booking.bookingStatus)) {
            return NextResponse.json({ success: false, message: "booking cannot be cancelled in its current state" }, { status: 400 })
        }

        // C4: Only the user who made the booking can cancel it
        const user = await User.findOne({ email: session.user.email })
        if (!user || booking.user.toString() !== user._id.toString()) {
            return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 })
        }

        booking.bookingStatus = "cancelled"
        await booking.save()

        // Notify driver if assigned
        if (booking.driver) {
            try {
                if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
                    const targetDriverId = typeof booking.driver === "object" && booking.driver !== null && "_id" in (booking.driver as any)
                        ? (booking.driver as any)._id.toString()
                        : booking.driver.toString()

                    await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                        event: "ride-status-update",
                        userId: targetDriverId,
                        data: { status: "cancelled", bookingId: booking._id }
                    })
                }
            } catch (socketErr) {
                console.warn("Socket notification skipped or failed:", socketErr)
            }
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error("[booking/cancel] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ success: false, message: "cancel booking error" }, { status: 500 })
    }
}