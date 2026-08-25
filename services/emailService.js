const nodemailer = require("nodemailer");

const gmailUser =
    process.env.SUPPORT_GMAIL_USER ||
    "talknaija.support@gmail.com";

const gmailPassword =
    process.env.SUPPORT_GMAIL_APP_PASSWORD;

const dns = require("dns");

const transporter =
    nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,

lookup: (hostname, options, callback) => {

    console.log(
        "🔥 SMTP LOOKUP CALLED:",
        hostname,
        options
    );

    dns.lookup(
        hostname,
        {
            family: 4,
            all: false
        },
        (error, address, family) => {

            console.log(
                "🔥 SMTP LOOKUP RESULT:",
                error || {
                    address,
                    family
                }
            );

            callback(
                error,
                address,
                family
            );

        }
    );

},

        auth: {
            user: gmailUser,
            pass: gmailPassword
        }
    });

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

    if (!gmailPassword) {

        throw new Error(
            "SUPPORT_GMAIL_APP_PASSWORD is not configured."
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
        await transporter.sendMail({

            from: {
                name: "TalkNaija Support",
                address: gmailUser
            },

            to,

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
                            ${escapeHtml(ticketId)}

                        </p>

                        <p style="
                            color: #777;
                            font-size: 13px;
                        ">

                            This email was sent by
                            TalkNaija Support.

                        </p>

                    </div>

                </body>
                </html>
            `,

            text:
                `TalkNaija Support

Hello,

You received a reply from TalkNaija Support regarding your support request.

${message}

Support ticket: ${ticketId}

This email was sent by TalkNaija Support.`

        });

    console.log(
        "📧 SUPPORT EMAIL SENT:",
        result.messageId
    );

    return result;

}


async function verifyEmailConnection() {

    if (!gmailPassword) {

        throw new Error(
            "SUPPORT_GMAIL_APP_PASSWORD is not configured."
        );

    }

    await transporter.verify();

    console.log(
        "✅ Gmail SMTP connection verified."
    );

    return true;

}


module.exports = {
    sendSupportReply,
    verifyEmailConnection
};
