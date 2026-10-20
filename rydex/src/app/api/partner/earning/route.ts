import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

/**
 * GET /api/partner/earning
 * C12: Fixed — auth result was never checked; driver could be null causing crash.
 */
export async function GET() {
    try {
        await connectDb()

        // C12: Properly validate session before DB query
        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const driver = await User.findOne({ email: session.user.email })
        if (!driver) {
            return NextResponse.json({ message: "user not found" }, { status: 404 })
        }

        // M2: Verify caller is actually a partner
        if (driver.role !== "partner") {
            return NextResponse.json({ message: "forbidden" }, { status: 403 })
        }

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const bookings = await Booking.find({
            driver: driver._id,
            paymentStatus: "paid",
            createdAt: { $gte: sevenDaysAgo }
        }).select("partnerAmount createdAt")

        const earningMap: Record<string, number> = {}

        bookings.forEach(b => {
            const date = new Date(b.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short"
            })
            if (!earningMap[date]) {
                earningMap[date] = 0
            }
            earningMap[date] = (earningMap[date] + b.partnerAmount) || 0
        })

        const earnings = Object.entries(earningMap).map(([date, earnings]) => ({ date, earnings }))

        return NextResponse.json(earnings, { status: 200 })

    } catch (error) {
        console.error("[partner/earning] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "partner earning error" }, { status: 500 })
    }
}