import { auth } from "@/auth"
import connectDb from "@/lib/db"
import PartnerBank from "@/models/partnerBank.model"
import PartnerDocs from "@/models/partnerDocs.model"
import User from "@/models/user.model"

import { NextRequest } from "next/server"

export async function handleApprove(
    req: NextRequest,
    context: { params: Promise<{ id: string }>}) {

        try {
              const session = await auth()
        if (!session || !session.user?.email || session.user.role !== "admin") {
            return Response.json({ message: "unauthorized" }, { status: 401 })
        }

        await connectDb()
        const partnerId = (await context.params).id
        const partner = await User.findById(partnerId)

        if (!partner || partner.role !== "partner") {
            return Response.json(
                { message: "partner not found" },
                { status: 404 }
            )
        }

        if(partner.partnerStatus==="approved"){
             return Response.json(
                {message:"partner already Approved"},
                {status:400}
            )
        }

        const partnerDocs=await PartnerDocs.findOne({owner:partner._id})
        const partnerBank=await PartnerBank.findOne({owner:partner._id})

        if(!partnerDocs || !partnerBank){
            return Response.json(
                {message:"partner did not complete on boarding steps"},
                {status:400}
            )
        }

        partner.partnerStatus="approved"
        partner.partnerOnBoardingSteps=4
        await partner.save()
        partnerDocs.status="approved"
        await partnerDocs.save()
        partnerBank.status="verified"
        await partnerBank.save()

        return Response.json(
           { message:"partner approved successfully"},{status:200}
        )

        } catch (error) {
            console.error("[admin/reviews/partner/approve] Error:", error instanceof Error ? error.message : error)
           return Response.json(
           { message: "partner approve error"},{status:500}
        ) 
        }
}

export { handleApprove as GET, handleApprove as POST }