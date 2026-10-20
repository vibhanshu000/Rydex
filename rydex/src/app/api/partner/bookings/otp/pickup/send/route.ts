import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/partner/bookings/otp/pickup/send
 * C6: Auth required. Only the partner (driver) of the booking may trigger the pickup OTP.
 * Upgraded to 6-digit OTP.
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

        const booking = await Booking.findById(bookingId).populate("user")
        if (!booking) {
            return NextResponse.json({ message: "booking not found" }, { status: 404 })
        }

        // C6: Only the assigned driver may send OTPs
        const partner = await User.findOne({ email: session.user.email })
        const driverId = (booking.driver as any)?._id?.toString() || booking.driver.toString()
        if (!partner || partner.role !== "partner" || driverId !== partner._id.toString()) {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        if (booking.bookingStatus !== "confirmed") {
            return NextResponse.json({ message: "booking is not in confirmed state" }, { status: 400 })
        }

        // C6: Upgraded from 4-digit to 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        booking.pickUpOtp = otp
        booking.pickUpOtpExpires = new Date(Date.now() + 5 * 60 * 1000)
        await booking.save()

        if (booking.user && (booking.user as any).email) {
            await sendMail((booking.user as any).email, "Your Pickup OTP - RYDEX",
                `
        <div style="font-family:sans-serif;padding:20px">
          <h2>Ride OTP</h2>
          <p>Your pickup OTP is:</p>
          <h1 style="letter-spacing:6px">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
          <p>Share this OTP with your driver to start the ride.</p>
          <br/>
          <b>RYDEX</b>
        </div>
        `)
        }

        return NextResponse.json({ message: "pick up otp sent" }, { status: 200 })

    } catch (error) {
        console.error("[otp/pickup/send] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "pick up otp error" }, { status: 500 })
    }
}