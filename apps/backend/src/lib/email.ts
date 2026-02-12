import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    try {
        const { data, error } = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to,
            subject,
            html,
        });

        if (error) {
            console.error("[email] Error sending email:", error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error("[email] Failed to send email:", error);
        throw error;
    }
}
