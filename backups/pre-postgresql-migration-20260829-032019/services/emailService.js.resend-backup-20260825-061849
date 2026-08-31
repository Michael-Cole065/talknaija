const { Resend } = require("resend");

const apiKey =
    process.env.RESEND_API_KEY;

const fromEmail =
    process.env.SUPPORT_FROM_EMAIL;

const resend =
    apiKey
        ? new Resend(apiKey)
        : null;


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


async function sendSupportReply({
    to,
    subject,
    message,
    ticketId
}) {

    if (!resend) {

        throw new Error(
            "RESEND_API_KEY is not configured."
        );

    }

    if (!fromEmail) {

        throw new Error(
            "SUPPORT_FROM_EMAIL is not configured."
        );

    }

    if (!to) {

        throw new Error(
            "Support recipient email is missing."
        );

    }

    const safeMessage =
        escapeHtml(message)
            .replace(/\r?\n/g, "<br>");

    const safeSubject =
        escapeHtml(subject);

    const result =
        await resend.emails.send({

            from:
                fromEmail,

            to: [
                to
            ],

            subject:
                subject.startsWith("Re:")
                    ? subject
                    : `Re: ${subject}`,

            html: `
                <!DOCTYPE html>

                <html>
                <body style="
                    margin: 0;
                    padding: 0;
                    background: #f5f5f5;
                    font-family: Arial, sans-serif;
                ">

                    <div style="
                        max-width: 600px;
                        margin: 30px auto;
                        background: #ffffff;
                        padding: 30px;
                        border-radius: 10px;
                    ">

                        <h2 style="
                            margin-top: 0;
                        ">
                            TalkNaija Support
                        </h2>

                        <p>
                            Hello,
                        </p>

                        <p>
                            You received a reply
                            from TalkNaija Support
                            regarding your support
                            request.
                        </p>

                        <div style="
                            margin: 20px 0;
                            padding: 18px;
                            background: #f7f7f7;
                            border-left: 4px solid #1877f2;
                            border-radius: 4px;
                        ">

                            ${safeMessage}

                        </div>

                        <p style="
                            color: #777;
                            font-size: 13px;
                        ">

                            Support ticket:
                            ${ticketId || "N/A"}

                        </p>

                        <hr>

                        <p style="
                            color: #777;
                            font-size: 12px;
                        ">

                            This email was sent by
                            TalkNaija Support.

                        </p>

                    </div>

                </body>
                </html>
            `

        });

    if (result.error) {

        throw new Error(
            result.error.message ||
            "Resend failed to send the email."
        );

    }

    return result.data;

}


module.exports = {
    sendSupportReply
};
