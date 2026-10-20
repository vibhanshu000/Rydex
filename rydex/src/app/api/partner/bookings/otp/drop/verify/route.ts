import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/partner/bookings/otp/drop/verify
 * C6: Auth required. Only the partner (driver) of the booking may verify the drop OTP.
 * H7: Fixed unconditional paymentStatus override.
 */
export async function POST(req: NextRequest) {
    try {
        await connectDb()

        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const { bookingId, otp } = await req.json()
        if (!bookingId || !otp) {
            return NextResponse.json({ message: "bookingId and otp are required" }, { status: 400 })
        }

        const booking = await Booking.findById(bookingId).populate("user")
        if (!booking) {
            return NextResponse.json({ message: "booking not found" }, { status: 404 })
        }

        // C6: Only the assigned driver may verify drop OTPs
        const partner = await User.findOne({ email: session.user.email })
        const driverId = (booking.driver as any)?._id?.toString() || booking.driver.toString()
        if (!partner || partner.role !== "partner" || driverId !== partner._id.toString()) {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        if (!booking.dropOtp) {
            return NextResponse.json({ message: "drop otp not generated" }, { status: 400 })
        }

        if (booking.dropOtpExpires && new Date(booking.dropOtpExpires).getTime() < Date.now()) {
            return NextResponse.json({ message: "otp expired" }, { status: 400 })
        }

        if (String(booking.dropOtp).trim() !== String(otp).trim()) {
            return NextResponse.json({ message: "incorrect drop otp" }, { status: 400 })
        }

        // H7: Fix - only update payment for cash rides; online rides are already "paid" by Razorpay
        if (booking.paymentStatus === "cash") {
            booking.adminCommission = booking.fare * 0.10
            booking.partnerAmount = booking.fare - booking.adminCommission
            booking.paymentStatus = "paid"
        }

        booking.bookingStatus = "completed"
        booking.dropOtp = ""
        booking.dropOtpExpires = undefined
        await booking.save()

        try {
            if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
                const targetUserId = (booking.user as any)?._id?.toString() || booking.user.toString()
                await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                    event: "ride-status-update",
                    userId: targetUserId,
                    data: { status: "completed", bookingId: booking._id }
                })
            }
        } catch (socketErr) {
            console.warn("Socket notification failed:", socketErr)
        }

        return NextResponse.json({ message: "drop otp verified" }, { status: 200 })

    } catch (error) {
        console.error("[otp/drop/verify] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "drop otp verify error" }, { status: 500 })
    }
}