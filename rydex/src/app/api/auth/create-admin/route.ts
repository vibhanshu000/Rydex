import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/create-admin
 * Body: { name, email, password, secret }
 *
 * Creates or updates an admin account.
 * Requires a ADMIN_SETUP_SECRET env variable to prevent unauthorized use.
 * Set ADMIN_SETUP_SECRET in .env.local then call this endpoint once to seed admin.
 */
export async function POST(req: NextRequest) {
    try {
        const { name, email, password, secret } = await req.json()

        if (!secret || secret !== process.env.ADMIN_SETUP_SECRET) {
            return NextResponse.json(
                { message: "unauthorized — wrong secret" },
                { status: 401 }
            )
        }

        if (!name || !email || !password) {
            return NextResponse.json(
                { message: "name, email, and password are required" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: "password must be at least 6 characters" },
                { status: 400 }
            )
        }

        const normalizedEmail = (email as string).trim().toLowerCase()
        await connectDb()

        const hashedPassword = await bcrypt.hash(password, 10)

        const existing = await User.findOne({ email: normalizedEmail })
        if (existing) {
            // Update existing user to admin
            existing.name = name
            existing.email = normalizedEmail
            existing.password = hashedPassword
            existing.role = "admin"
            existing.isEmailVerified = true
            await existing.save()
            return NextResponse.json(
                { success: true, message: "Admin account updated", email: normalizedEmail },
                { status: 200 }
            )
        }

        await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: "admin",
            isEmailVerified: true,
        })

        return NextResponse.json(
            { success: true, message: "Admin account created", email },
            { status: 201 }
        )

    } catch (error) {
        return NextResponse.json(
            { message: `create-admin error: ${error}` },
            { status: 500 }
        )
    }
}
