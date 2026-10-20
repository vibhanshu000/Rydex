import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json()

        if (!name || !email || !password) {
            return NextResponse.json({ message: "name, email and password are required" }, { status: 400 })
        }

        // L1: Normalize email
        const normalizedEmail = (email as string).trim().toLowerCase()

        if (password.length < 6) {
            return NextResponse.json(
                { message: "password must be at least 6 characters" },
                { status: 400 }
            )
        }

        await connectDb()
        let user = await User.findOne({ email: normalizedEmail })

        if (user && user.isEmailVerified) {
            return NextResponse.json(
                { message: "email already exists!" },
                { status: 400 }
            )
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
        const hashedPassword = await bcrypt.hash(password, 10)

        if (user && !user.isEmailVerified) {
            user.name = name
            user.password = hashedPassword
            user.email = normalizedEmail
            user.otp = otp
            user.otpExpiresAt = otpExpiresAt
            user.isEmailVerified = false
            await user.save()
        } else {
            user = await User.create({
                name,
                email: normalizedEmail,
                password: hashedPassword,
                otp,
                otpExpiresAt,
                isEmailVerified: false
            })
        }

        await sendMail(
            normalizedEmail,
            "Your OTP for Email Verification",
            `<h2>Your Email Verification OTP is <strong>${otp}</strong></h2><p>Valid for 10 minutes.</p>`
        )

        // C9: Return ONLY safe fields — never the password hash, OTP, or otpExpiresAt
        return NextResponse.json(
            { success: true, message: "OTP sent to your email. Please verify your account." },
            { status: 201 }
        )

    } catch (error) {
        console.error("[auth/register] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json(
            { message: "registration error" },
            { status: 500 }
        )
    }
}