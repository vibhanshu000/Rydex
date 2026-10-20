import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
    try {
         await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const partner = await User.findOne({ email: session.user.email })
        if (!partner) {
            return NextResponse.json({ message: "partner not found" }, { status: 404 })
        }

        const bookings = await Booking.find({
            driver: partner._id,
            bookingStatus: "requested"
        })
            .populate({ path: "user", select: "-password -otp -otpExpiresAt" })
            .populate({ path: "driver", select: "-password -otp -otpExpiresAt" })
            .populate("vehicle")

        const safeBookings = bookings.map(b => {
            const obj = b.toObject ? b.toObject() : { ...b }
            delete (obj as any).pickUpOtp
            delete (obj as any).dropOtp
            return obj
        })

        return NextResponse.json(safeBookings, { status: 200 })
    } catch (error) {
        console.error("[partner/bookings/pending] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "fetch pending req error" }, { status: 500 })
    }
}