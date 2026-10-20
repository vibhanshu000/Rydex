import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/earning
 * C11: Admin authentication required — this was previously a public endpoint.
 */
export async function GET() {
    try {
        await connectDb()

        // C11: Require admin authentication
        const session = await auth()
        if (!session?.user?.email || session.user.role !== "admin") {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const bookings = await Booking.find({
            paymentStatus: "paid",
            createdAt: { $gte: sevenDaysAgo }
        }).select("adminCommission createdAt")

        const earningMap: Record<string, number> = {}

        bookings.forEach(b => {
            const date = new Date(b.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short"
            })
            if (!earningMap[date]) {
                earningMap[date] = 0
            }
            earningMap[date] = (earningMap[date] + b.adminCommission) || 0
        })

        const earnings = Object.entries(earningMap).map(([date, earnings]) => ({ date, earnings }))

        return NextResponse.json(earnings, { status: 200 })

    } catch (error) {
        console.error("[admin/earning] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ message: "admin earning error" }, { status: 500 })
    }
}