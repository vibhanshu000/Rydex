import nodemailer from "nodemailer"

export const sendMail = async (to: string, subject: string, html: string) => {
    try {
        if (!process.env.EMAIL || !process.env.PASS) {
            console.warn("Email credentials missing in .env.local, skipping sendMail")
            return
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS
            }
        })
        await transporter.sendMail({
            from: `"RYDEX" <${process.env.EMAIL}>`,
            to,
            subject,
            html
        })
    } catch (error) {
        console.warn("sendMail error (email delivery skipped):", error instanceof Error ? error.message : error)
    }
}