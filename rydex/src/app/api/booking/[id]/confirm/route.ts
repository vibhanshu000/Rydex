import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/booking/[id]/confirm
 * C3: Confirms a booking with cash payment.
 * Only the partner (driver) assigned to this booking may call this.
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

        const bookingId = (await context.params).id
        const booking = await Booking.findById(bookingId)

        if (!booking) {
            return NextResponse.json({ success: false, message: "booking not found." }, { status: 404 })
        }

        const currentUser = await User.findOne({ email: session.user.email })
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "user not found" }, { status: 404 })
        }

        const isBookingUser = booking.user.toString() === currentUser._id.toString()
        const isBookingDriver = booking.driver.toString() === currentUser._id.toString()

        if (!isBookingUser && !isBookingDriver) {
            return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 })
        }

        booking.paymentStatus = "cash"
        booking.bookingStatus = "confirmed"
        booking.adminCommission = booking.fare * 0.1
        booking.partnerAmount = booking.fare * 0.9
        await booking.save()

        try {
            if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
                const targetDriverId = (booking.driver as any)?._id?.toString() || booking.driver.toString()
                await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                    event: "ride-status-update",
                    userId: targetDriverId,
                    data: { status: "confirmed", bookingId: booking._id }
                })
            }
        } catch (socketErr) {
            console.warn("Socket notification skipped or failed:", socketErr)
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error("[booking/confirm] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ success: false, message: "cash confirm error" }, { status: 500 })
    }
}