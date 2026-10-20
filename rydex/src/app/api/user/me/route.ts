import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function GET(req: Request) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || !session.user) {
            return Response.json(
                { message: "user is not authenticated" },
                { status: 401 }
            )
        }
        const user = await User.findOne({ email: session.user.email })
            // C10: Strip sensitive fields — password hash, OTP, OTP expiry
            .select("-password -otp -otpExpiresAt")

        if (!user) {
            return Response.json(
                { message: "user not found!" },
                { status: 404 }
            )
        }

        return Response.json(user, { status: 200 })

    } catch (error) {
        console.error("[user/me] Error:", error instanceof Error ? error.message : error)
        return Response.json(
            { message: "get me error" },
            { status: 500 }
        )
    }
}