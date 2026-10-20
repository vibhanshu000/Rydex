import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto"

export async function POST(req: NextRequest) {
    try {
        await connectDb()

        // C2: Require authentication
        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 })
        }

        const { bookingId, razorpay_payment_id, razorpay_signature, razorpay_order_id } = await req.json()

        if (!bookingId || !razorpay_payment_id || !razorpay_signature || !razorpay_order_id) {
            return NextResponse.json({ success: false, message: "missing required fields" }, { status: 400 })
        }

        // Verify HMAC signature first (prevents forged requests)
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ success: false, message: "invalid signature" }, { status: 400 })
        }

        const booking = await Booking.findById(bookingId)
        if (!booking) {
            return NextResponse.json({ success: false, message: "booking is not found." }, { status: 404 })
        }

        // C2: Verify the authenticated user owns this booking (IDOR prevention)
        const user = await User.findOne({ email: session.user.email })
        if (!user || booking.user.toString() !== user._id.toString()) {
            return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 })
        }

        const adminCommission = booking.fare * 0.10
        const partnerAmount = booking.fare - adminCommission
        booking.adminCommission = adminCommission
        booking.partnerAmount = partnerAmount
        booking.paymentStatus = "paid"
        booking.bookingStatus = "confirmed"
        await booking.save()

        try {
            if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
                await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                    event: "ride-status-update",
                    userId: booking.driver,
                    data: { status: "confirmed", bookingId: booking._id }
                })
            }
        } catch (socketErr) {
            console.warn("Socket notification skipped or failed:", socketErr)
        }

        return NextResponse.json(
            { success: true, adminCommission, partnerAmount },
            { status: 200 }
        )

    } catch (error) {
        console.error("[payment/verify] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ success: false, message: "payment verification error" }, { status: 500 })
    }
}