import { auth } from "@/auth";
import AdminDashboard from "@/components/AdminDashboard";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.email) {
        redirect("/");
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email.trim().toLowerCase() });
    if (user?.role !== "admin") {
        redirect("/");
    }

    return <AdminDashboard />;
}
