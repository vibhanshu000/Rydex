import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle, { IVehicle } from "@/models/vehicle.model";
import { NextRequest } from "next/server";

const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;
export async function POST(req: Request) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return Response.json({ message: "unauthorized" }, { status: 401 })
        }

        const user = await User.findOne({ email: session.user.email })
        if (!user) {
            return Response.json({ message: "user not found" }, { status: 404 })
        }

        const { type, number, vehicleModel } = await req.json()
        if (!type || !number || !vehicleModel) {
            return Response.json({ message: "missing Required details" }
                , { status: 400 }
            )
        }

        if (!VEHICLE_REGEX.test(number)) {
            return Response.json(
                { message: "Invalid Vehicle Number Format" }
                , { status: 400 }
            )
        }
        const vehicleNumber = number.toUpperCase()

        let vehicle = await Vehicle.findOne({ owner: user._id })
        if (vehicle) {
            // C13: When updating, check uniqueness excluding the current vehicle
            const duplicate = await Vehicle.findOne({ number: vehicleNumber, _id: { $ne: vehicle._id } })
            if (duplicate) {
                return Response.json(
                    { message: "Vehicle number already registered by another partner" },
                    { status: 400 }
                )
            }
            vehicle.type = type
            vehicle.number = vehicleNumber
            vehicle.vehicleModel = vehicleModel
            vehicle.status = "pending"
            await vehicle.save()
            user.partnerOnBoardingSteps = Math.max(user.partnerOnBoardingSteps || 0, 1)
            if (user.partnerStatus !== "approved") {
                user.partnerStatus = "pending"
            }
            await user.save()
            return Response.json(vehicle, { status: 200 })
        }

        const duplicate = await Vehicle.findOne({ number: vehicleNumber })
        if (duplicate) {
            return Response.json(
                { message: "Vehicle already registered" }
                , { status: 400 }
            )
        }

        vehicle = await Vehicle.create({
            owner: user._id,
            type,
            number: vehicleNumber,
            vehicleModel
        })

        user.partnerOnBoardingSteps = Math.max(user.partnerOnBoardingSteps || 0, 1)
        user.role = "partner"
        if (user.partnerStatus !== "approved") {
            user.partnerStatus = "pending"
        }
        await user.save()

        return Response.json(vehicle, { status: 201 })

    } catch (error) {
        console.log(error)
        return Response.json({ message: `vehicle error ${error}` },
            { status: 500 })
    }
}

export async function GET(req:NextRequest){
    try {
        await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return Response.json({ message: "unauthorized" }, { status: 401 })
        }

        const user = await User.findOne({ email: session.user.email })
        if (!user) {
            return Response.json({ message: "user not found" }, { status: 404 })
        }
        let vehicle = await Vehicle.findOne({ owner: user._id })
        if(vehicle){
            return Response.json(vehicle, { status: 200 })
        }else{
            return Response.json({ message: "vehicle not found" }, { status: 404 })
        }

    } catch (error) {
        return Response.json({ message: `get vehicle error ${error}` },
            { status: 500 })
    }
}