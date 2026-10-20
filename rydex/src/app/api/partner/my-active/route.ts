import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import User from "@/models/user.model"
import Vehicle from "@/models/vehicle.model"
import { NextResponse } from "next/server"

export async function GET() {
    try {
         await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const user = await User.findOne({ email: session.user.email })
        if (!user) {
            return NextResponse.json({ message: "user not found" }, { status: 404 })
        }

        if (user.role !== "partner") {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        const booking = await Booking.findOne({
            driver: user._id,
            bookingStatus: { $in: ["awaiting_payment", "confirmed", "started"] }
        })
            .sort({ createdAt: -1 })
            .populate({ path: "user", select: "-password -otp -otpExpiresAt" })
            .populate({ path: "driver", select: "-password -otp -otpExpiresAt" })
            .populate("vehicle")

        if (!booking) {
            return NextResponse.json(null, { status: 200 })
        }

        const bookingObj = booking.toObject ? booking.toObject() : { ...booking }
        // Driver should not see OTPs directly
        delete (bookingObj as any).pickUpOtp
        delete (bookingObj as any).dropOtp

        return NextResponse.json(bookingObj, { status: 200 })

    } catch (error) {
        console.error("[partner/my-active] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "get active ride for partner error" }, { status: 500 })
    }
}