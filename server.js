const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();
const queue = require("./services/queueService");
const registerSocketHandlers = require("./sockets");
const reportService = require("./services/reportService");
const {
    createSupportTicket,
    getAllSupportTickets
} = require(
    "./services/supportService"
);
const {
    initializeTransaction,
    verifyTransaction
} = require(
    "./services/paystackService"
);
const app = express();
let server = http.createServer(app);

const io = new Server(server);
const activePairs = new Map();

app.use(express.json());

// ========================================
// ADMIN AUTHENTICATION
// ========================================

function adminAuth(req, res, next) {

    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Basic ")) {

        res.setHeader(
            "WWW-Authenticate",
            'Basic realm="TalkNaija Admin"'
        );

        return res.status(401).send("Authentication required.");
    }

    const encoded = auth.split(" ")[1];

    let decoded;

    try {

        decoded = Buffer
            .from(encoded, "base64")
            .toString("utf8");

    } catch (error) {

        return res.status(401).send("Invalid authentication.");

    }

    const separator = decoded.indexOf(":");

    if (separator === -1) {

        return res.status(401).send("Invalid authentication.");

    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {

        res.setHeader(
            "WWW-Authenticate",
            'Basic realm="TalkNaija Admin"'
        );

        return res.status(401).send("Invalid credentials.");

    }

    next();

}

// ========================================
// PUBLIC SUPPORT SUBMISSION
// ========================================

app.post(
    "/api/support",
    (req, res) => {

        try {

            const {
                email,
                subject,
                message
            } = req.body || {};


            if (
                typeof email !== "string" ||
                typeof subject !== "string" ||
                typeof message !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please complete all support fields."

                });

            }


            const cleanEmail =
                email.trim();

            const cleanSubject =
                subject.trim();

            const cleanMessage =
                message.trim();


            if (
                !cleanEmail ||
                !cleanSubject ||
                !cleanMessage
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please complete all support fields."

                });

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    cleanEmail
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid email address."

                });

            }


            const ticket =
                createSupportTicket(
                    cleanEmail,
                    cleanSubject,
                    cleanMessage
                );


            console.log(
                "📩 NEW SUPPORT TICKET:",
                ticket.id,
                ticket.email
            );


            return res.status(201).json({

                success: true,

                ticketId:
                    ticket.id,

                message:
                    "Your support request has been received."

            });

        } catch (error) {

            console.error(
                "❌ SUPPORT SUBMISSION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to submit your support request."

            });

        }

    }
);


app.get(
    "/api/payment/verify/:reference",
    async (req, res) => {

        try {

            const reference =
                req.params.reference;

            if (!reference) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment reference is required."

                });

            }

            const result =
                await verifyTransaction(
                    reference
                );

            return res.json({

                success: true,

                payment: result

            });

        } catch (error) {

            console.error(
                "❌ PAYSTACK VERIFICATION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to verify payment."

            });

        }

    }
);

// ========================================
// SUPPORT ADMIN API
// ========================================

app.get(
    "/api/support",
    adminAuth,
    (req, res) => {

        try {

            const tickets =
                getAllSupportTickets();

            res.json({
                success: true,
                tickets
            });

        } catch (error) {

            console.error(
                "Support inbox error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Unable to load support tickets."
            });

        }

    }
);


// ========================================
// PROTECT ADMIN PAGE
// ========================================

app.get("/admin-reports.html", adminAuth, (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "admin-reports.html")
    );

});

// ========================================
// PROTECT SUPPORT ADMIN PAGE
// ========================================

app.get(
    "/admin-support.html",
    adminAuth,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "admin-support.html"
            )
        );

    }
);

// ========================================
// REPORT API
// ========================================

app.get("/api/reports", adminAuth, (req, res) => {

    res.json(reportService.getReports());

});

app.post("/api/reports/:id/block", adminAuth, (req, res) => {

    const reports =
        reportService.getReports();

    const report =
        reports.find(
            (item) => item.id === req.params.id
        );

    if (!report) {

        return res.status(404).json({
            error: "Report not found."
        });

    }

    const blocked =
        registerSocketHandlers.blockPair(
            report.reporter,
            report.reported
        );

    if (!blocked) {

        return res.status(400).json({
            error: "Could not block this pair."
        });

    }

    const updatedReport =
        reportService.setReportBlocked(
            req.params.id,
            true
        );

    res.json({
        success: true,
        report: updatedReport
    });

});

app.post("/api/reports/:id/unblock", adminAuth, (req, res) => {

    const reports =
        reportService.getReports();

    const report =
        reports.find(
            (item) => item.id === req.params.id
        );

    if (!report) {

        return res.status(404).json({
            error: "Report not found."
        });

    }

    registerSocketHandlers.unblockPair(
        report.reporter,
        report.reported
    );

    const updatedReport =
        reportService.setReportBlocked(
            req.params.id,
            false
        );

    res.json({
        success: true,
        report: updatedReport
    });

});

app.put("/api/reports/:id", adminAuth, (req, res) => {

    const { status } = req.body;

    const allowedStatuses = [
        "pending",
        "reviewed",
        "action_taken",
        "dismissed"
    ];

    if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
            error: "Invalid report status."
        });

    }

    const report = reportService.updateReportStatus(
        req.params.id,
        status
    );

    if (!report) {

        return res.status(404).json({
            error: "Report not found."
        });

    }

    res.json(report);

});

// ========================================
// PUBLIC FILES
// ========================================

app.use(express.static(
    path.join(__dirname, "public")
));

// ========================================
// SOCKET.IO
// ========================================

registerSocketHandlers(
    io,
    activePairs,
    queue
);

// ========================================
// PAYSTACK SUPPORT PAYMENT
// ========================================

app.post(
    "/api/payment/initialize",
    async (req, res) => {

        try {

            const {
                email,
                amount
            } = req.body || {};

            if (
                typeof email !== "string" ||
                typeof amount !== "number"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid email and amount are required."
                });

            }

            const cleanEmail =
                email.trim();

            if (!cleanEmail) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email is required."
                });

            }

            if (
                !Number.isInteger(amount) ||
                amount < 2000
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Minimum support amount is ₦2000."
                });

            }

            const reference =
                "TN-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2, 10);

            const transaction =
                await initializeTransaction({

                    email:
                        cleanEmail,

                    amount:
                        amount * 100,

                    reference,

                    callbackUrl:
                        process.env.PAYSTACK_CALLBACK_URL || ""

                });

            return res.json({

                success: true,

                authorizationUrl:
                    transaction.authorization_url,

                accessCode:
                    transaction.access_code,

                reference:
                    transaction.reference

            });

        } catch (error) {

            console.error(
                "❌ PAYSTACK INITIALIZATION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to initialize payment."

            });

        }

    }
);

// ========================================
// PAYSTACK PAYMENT VERIFICATION
// ========================================

app.get(
    "/api/payment/verify/:reference",
    async (req, res) => {

        try {

            const reference =
                req.params.reference;

            if (!reference) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment reference is required."

                });

            }

            const result =
                await verifyTransaction(
                    reference
                );

            return res.json({

                success: true,

                payment: result

            });

        } catch (error) {

            console.error(
                "❌ PAYSTACK VERIFICATION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to verify payment."

            });

        }

    }
);

// ========================================
// SERVER
// ========================================

const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `🚀 TalkNaija running on port ${PORT}`
    );

});
