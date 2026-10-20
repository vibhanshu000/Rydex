import { auth } from "@/auth";
import connectDb from "@/lib/db";
import razorpay from "@/lib/razorpay";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()

        // C1: Require authentication
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
            return NextResponse.json({ message: "booking is not found." }, { status: 404 })
        }

        // C1: Verify the authenticated user owns this booking
        const user = await User.findOne({ email: session.user.email })
        if (!user || booking.user.toString() !== user._id.toString()) {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        if (booking.bookingStatus !== "awaiting_payment") {
            return NextResponse.json({ message: "booking is not awaiting payment" }, { status: 400 })
        }

        const order = await razorpay.orders.create({
            amount: Math.round(booking.fare * 100),
            currency: "INR",
            receipt: booking._id.toString()
        })

        return NextResponse.json(
            { orderId: order.id, amount: order.amount },
            { status: 200 }
        )

    } catch (error) {
        console.error("[payment/create] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "payment create error" }, { status: 500 })
    }
}