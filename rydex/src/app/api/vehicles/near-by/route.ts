import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest) {
    try {
        await connectDb()
        const {latitude,longitude,vehicleType}=await req.json()
        if(!latitude||!longitude){
            return NextResponse.json(
                {message:"coordinates not found"},
                {status:400}
            )
        }

        let partners = []
        try {
            partners = await User.find({
                role: "partner",
                isOnline: true,
                partnerStatus: "approved",
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude]
                        },
                        $maxDistance: 50000
                    }
                }
            })
        } catch (geoError) {
            console.warn("Geospatial near query warning:", geoError)
        }

        if (partners.length === 0) {
            partners = await User.find({
                role: "partner",
                isOnline: true,
                partnerStatus: "approved"
            })
        }

        if (partners.length === 0) {
            partners = await User.find({
                role: "partner",
                partnerStatus: "approved"
            })
        }

        const partnerIds = partners.map(p => p._id)

        if (partnerIds.length === 0) {
            return NextResponse.json([], { status: 200 })
        }

        const vehicleQuery: any = {
            owner: { $in: partnerIds },
            status: "approved",
            isActive: true
        }

        if (vehicleType && typeof vehicleType === "string" && vehicleType.trim() !== "") {
            vehicleQuery.type = vehicleType.trim()
        }

        const vehicles = await Vehicle.find(vehicleQuery).lean()

        return NextResponse.json(vehicles, { status: 200 })


    } catch (error) {
        return NextResponse.json(
                {message:`near by vehicles error ${error}`},
                {status:500}
            )
    }
}
