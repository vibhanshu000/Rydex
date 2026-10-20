import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "unauthorized" },
                { status: 401 }
            )
        }

        const {
            driverId,
            vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            mobileNumber,
        } = await req.json()


        if (!driverId || !vehicleId || !pickUpLocation.coordinates || !dropLocation.coordinates) {
            return NextResponse.json(
                { message: "missing required details" },
                { status: 400 }
            )
        }
        const user = await User.findOne({ email: session.user.email })
        if (!user) {
            return NextResponse.json(
                { message: "user not found" },
                { status: 404 }
            )
        }

        const driver = await User.findById(driverId)
        if (!driver) {
            return NextResponse.json(
                { message: "driver not found" },
                { status: 404 }
            )
        }

        // Verify driver is a partner
        if (driver.role !== "partner" || (driver.partnerStatus && driver.partnerStatus !== "approved")) {
            return NextResponse.json(
                { message: "driver is not an approved partner" },
                { status: 400 }
            )
        }

        const existing = await Booking.findOne({
            user: user._id,
            bookingStatus: {
                $in: ["requested", "awaiting_payment", "confirmed", "started"]
            }
        })
        console.log(existing)

        if (existing) {
            return NextResponse.json(
                existing
            )
        }

        const booking = await Booking.create({
            user: user._id,
            driver: driverId,
            vehicle: vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            userMobileNumber: mobileNumber,
            driverMobileNumber: driver.mobileNumber,
            bookingStatus: "requested"
        })

        // Send real-time socket event (non-blocking so socket server downtime won't fail the booking)
        try {
            if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
                await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                    event: "new-booking",
                    userId: driverId,
                    data: booking
                })
            }
        } catch (socketError) {
            console.warn("Socket server notification skipped or unavailable:", socketError instanceof Error ? socketError.message : socketError)
        }

        return NextResponse.json(
            booking, { status: 200 }
        )

    } catch (error) {
        return NextResponse.json(
            { message: `create booking error ${error}` },
            { status: 500 }
        )
    }
}