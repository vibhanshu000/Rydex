import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/partner/bookings/[id]/reject
 * C5: Only the partner assigned as driver for this booking may reject it.
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

        if (!booking || booking.bookingStatus !== "requested") {
            return NextResponse.json({ success: false, message: "booking not found or already processed" }, { status: 400 })
        }

        // C5: Verify caller is the partner assigned to this booking
        const partner = await User.findOne({ email: session.user.email })
        if (!partner || partner.role !== "partner" || booking.driver.toString() !== partner._id.toString()) {
            return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 })
        }

        booking.bookingStatus = "rejected"
        await booking.save()

        try {
            if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
                await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                    event: "reject-booking",
                    userId: booking.user,
                    data: booking.bookingStatus
                })
            }
        } catch (socketError) {
            console.warn("Socket notification skipped or unavailable:", socketError instanceof Error ? socketError.message : socketError)
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error("[partner/bookings/reject] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ success: false, message: "reject booking error" }, { status: 500 })
    }
}