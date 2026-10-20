import { auth } from "@/auth"
import connectDb from "@/lib/db"
import User from "@/models/user.model"


export async function GET() {
    try {
          await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return Response.json({ message: "unauthorized" }, { status: 401 })
        }

        const partner = await User.findOne({ email: session.user.email })
        if (!partner) {
            return Response.json({ message: "partner not found" }, { status: 404 })
        }

        const blockedStatuses = ["pending", "in_progress", "approved"]
        if (blockedStatuses.includes(partner.videoKycStatus)) {
            return Response.json(
                { message: `Cannot submit KYC request: current status is ${partner.videoKycStatus}` },
                { status: 400 }
            )
        }
        partner.videoKycStatus="pending"
        partner.videoKycRejectionReason=undefined
        partner.videoKycRoomId=undefined
        await partner.save()
         return Response.json({ success: true}
                , { status: 200 }
            )
    } catch (error) {
        return Response.json({ message:`kyc request error ${error}`}
                , { status: 500 }
            )
    }
}