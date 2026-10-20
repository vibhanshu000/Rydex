import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import User from "@/models/user.model"
import Vehicle from "@/models/vehicle.model"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/user/active-ride
 * C7: Fixed IDOR — verifies the requesting user owns this booking.
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
            .populate({ path: "user", select: "-password -otp -otpExpiresAt" })
            .populate({ path: "driver", select: "-password -otp -otpExpiresAt" })
            .populate("vehicle")
        if (!booking) {
            return NextResponse.json({ message: "booking not found" }, { status: 404 })
        }

        // C7: Verify the requesting user is the booking owner OR the assigned driver
        const user = await User.findOne({ email: session.user.email })
        if (!user) {
            return NextResponse.json({ message: "user not found" }, { status: 404 })
        }

        const bookingUserId = (booking.user as any)?._id?.toString() ?? booking.user.toString()
        const bookingDriverId = (booking.driver as any)?._id?.toString() ?? booking.driver.toString()
        const isOwner = bookingUserId === user._id.toString()
        const isDriver = bookingDriverId === user._id.toString()

        if (!isOwner && !isDriver) {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        const bookingObj = booking.toObject ? booking.toObject() : { ...booking }

        // Security: only the rider should see the OTPs to communicate them to driver
        if (!isOwner) {
            delete (bookingObj as any).pickUpOtp
            delete (bookingObj as any).dropOtp
        }

        return NextResponse.json(bookingObj, { status: 200 })

    } catch (error) {
        console.error("[user/active-ride] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "get active ride error" }, { status: 500 })
    }
}