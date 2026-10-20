import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function GET() {
    try {
        await connectDb()
         const session = await auth()
                if (!session || !session.user?.email || session.user.role !== "admin") {
                    return Response.json({ message: "unauthorized" }
                        , { status: 401 }
                    )
                }

          // H1 + Strip sensitive fields from partner list
          const partner = await User.find({
            role: "partner",
            videoKycStatus: { $in: ["pending", "in_progress"] }
          }).select("-password -otp -otpExpiresAt")
          return Response.json(
            partner,{status:200}
          )      
    } catch (error) {
         return Response.json(
           {message:`partner kyc get error ${error}`},{status:500}
          ) 
    }
}