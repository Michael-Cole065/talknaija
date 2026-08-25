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
const historyService =
    require("./services/historyService");
const identityService =
    require("./services/identityService");

const trafficService =
    require("./services/trafficService");

const {
    createSupportTicket,
    getAllSupportTickets,
    getSupportTicket,
    addReply
} = require(
    "./services/supportService"
);
const {
    initializeTransaction,
    verifyTransaction
} = require(
    "./services/paystackService"
);
const donationService =
    require("./services/donationService");

const adminActionService =
    require("./services/adminActionService");
const {
    sendSupportReply
} = require("./services/emailService");
const app = express();
let server;

if (process.env.NODE_ENV === "production") {

    server =
        http.createServer(app);

} else {

    server =
        https.createServer(
            {
                key:
                    fs.readFileSync(
                        path.join(
                            __dirname,
                            "cert/server.key"
                        )
                    ),

                cert:
                    fs.readFileSync(
                        path.join(
                            __dirname,
                            "cert/server.crt"
                        )
                    )
            },
            app
        );

}

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

if (
    result.status === "success"
) {

    donationService.recordDonation(
        result
    );

}

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

app.get(
    "/api/support/:id",
    adminAuth,
    (req, res) => {

        try {

            const ticket =
                getSupportTicket(
                    req.params.id
                );

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Support message not found."
                });
            }

            res.json({
                success: true,
                ticket
            });

        } catch (error) {

            console.error(
                "Support message error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load support message."
            });

        }

    }
);


app.post(
    "/api/support/:id/reply",
    adminAuth,
    (req, res) => {

        try {

            const message =
                typeof req.body?.message === "string"
                    ? req.body.message.trim()
                    : "";

            if (!message) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Reply message is required."
                });

            }

            const reply =
                addReply(
                    req.params.id,
                    message
                );

            if (!reply) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Support message not found."
                });

            }

            res.json({
                success: true,
                reply
            });

        } catch (error) {

            console.error(
                "Support reply error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to send reply."
            });

        }

    }
);

// ========================================
// PROTECT MAIN ADMIN DASHBOARD
// ========================================

app.get("/admin.html", adminAuth, (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "admin.html"
        )
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
// ADMIN DASHBOARD API
// ========================================

app.get(
    "/api/admin/stats",
    adminAuth,
    (req, res) => {

        const reports =
            reportService.getReports();

        const redAccounts =
            reportService.getRedAccounts();

        const stats = {

            totalReports:
                reports.length,

            pendingReports:
                reports.filter(
                    (report) =>
                        report.status ===
                        "pending"
                ).length,

            reviewedReports:
                reports.filter(
                    (report) =>
                        report.status ===
                        "reviewed"
                ).length,

            actionTakenReports:
                reports.filter(
                    (report) =>
                        report.status ===
                        "action_taken"
                ).length,

            dismissedReports:
                reports.filter(
                    (report) =>
                        report.status ===
                        "dismissed"
                ).length,

            redAccounts:
                redAccounts.length

        };

        res.json(stats);

    }
);


app.get(
    "/api/admin/red-accounts",
    adminAuth,
    (req, res) => {

        res.json(
            reportService.getRedAccounts()
        );

    }
);

app.get(
    "/api/admin/action-taken",
    adminAuth,
    (req, res) => {

        const reports =
            reportService
                .getReports()
                .filter(
                    (report) =>
                        report.status ===
                        "action_taken"
                )
                .map(
                    (report) => ({

                        type:
                            "REPORT",

                        id:
                            report.id,

                        userId:
                            report.reported,

                        reporter:
                            report.reporter,

                        reason:
                            report.reason,

                        createdAt:
                            report.updatedAt ||
                            report.createdAt

                    })
                );

        const adminActions =
            adminActionService
                .getAllActions();

        const actions = [
            ...reports,
            ...adminActions
        ];

        actions.sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );

        res.json({
            count:
                actions.length,

            actions
        });

    }
);

app.post(
    "/api/admin/action-taken/:uuid/ban",
    adminAuth,
    (req, res) => {

        const uuid =
            req.params.uuid;

        const user =
            identityService.getUser(
                uuid
            );

        if (!user) {

            return res.status(404).json({
                error:
                    "User not found."
            });

        }

        const success =
            identityService.setBanned(
                uuid,
                true,
                "Manually banned from Action Taken"
            );

        if (!success) {

            return res.status(400).json({
                error:
                    "Could not ban user."
            });

        }

        adminActionService.recordAction({

            type:
                "BAN",

            userId:
                uuid,

            details:
                "Account manually banned from Action Taken and returned to Red Accounts."

        });

        console.log(
            "🔴 USER MANUALLY BANNED:",
            uuid
        );

        res.json({
            success: true,

            message:
                "User banned successfully."
        });

    }
);

app.post(
    "/api/admin/red-accounts/:uuid/unban",
    adminAuth,
    (req, res) => {

        const uuid =
            req.params.uuid;

        const success =
            identityService.resetReportCount(
                uuid
            );

        if (!success) {

            return res.status(404).json({
                error:
                    "User not found."
            });

        }

        adminActionService.recordAction({

            type:
                "UNBAN",

            userId:
                uuid,

            details:
                "Account unbanned and current report count reset."

        });

        console.log(
            "🟢 USER UNBANNED:",
            uuid
        );

        res.json({
            success: true,
            message:
                "User unbanned successfully."
        });

    }
);

app.get(
    "/api/admin/donations",
    adminAuth,
    (req, res) => {

        const stats =
            donationService.getDonationStats();

        res.json(stats);

    }
);

app.get(
    "/api/admin/donations/history",
    adminAuth,
    (req, res) => {

        res.json(
            donationService.getAllDonations()
        );

    }
);

// ========================================
// ADMIN TRAFFIC API
// ========================================

app.get(
    "/api/admin/traffic",
    adminAuth,
    (req, res) => {

        const limit =
            Math.min(
                Number(req.query.limit) || 100,
                1000
            );

        const visits =
            trafficService.getRecentVisits(
                limit
            );

        res.json({
            totalVisits:
                trafficService.getVisitCount(),

            visits
        });

    }
);

// ========================================
// ADMIN GUESTS API
// ========================================

app.get(
    "/api/admin/guests",
    adminAuth,
    (req, res) => {

        const users =
            identityService
                .getUsers()
                .filter(
                    (user) =>
                        user.type === "guest"
                );

        users.sort(
            (a, b) =>
                new Date(b.lastActive) -
                new Date(a.lastActive)
        );

        res.json({
            count:
                users.length,

            users
        });

    }
);

// ========================================
// ADMIN MEMBERS API
// ========================================

app.get(
    "/api/admin/members",
    adminAuth,
    (req, res) => {

        const users =
            identityService
                .getUsers()
                .filter(
                    (user) =>
                        user.type !== "guest"
                );

        users.sort(
            (a, b) =>
                new Date(b.lastActive) -
                new Date(a.lastActive)
        );

        res.json({
            count:
                users.length,

            users
        });

    }
);

// ========================================
// ADMIN PREMIUM API
// ========================================

app.get(
    "/api/admin/premium",
    adminAuth,
    (req, res) => {

        const users =
            identityService
                .getUsers()
                .filter(
                    (user) =>
                        user.isPremium === true
                );

        users.sort(
            (a, b) =>
                new Date(b.lastActive) -
                new Date(a.lastActive)
        );

        res.json({
            count:
                users.length,

            users
        });

    }
);

// ========================================
// ADMIN USER HISTORY API
// ========================================

app.get(
    "/api/admin/users/:uuid/history",
    adminAuth,
    (req, res) => {

        const uuid =
            req.params.uuid;

        const user =
            identityService.getUser(
                uuid
            );

        if (!user) {

            return res.status(404).json({
                error:
                    "User not found."
            });

        }

        const visits =
            trafficService.getUserVisits(
                uuid
            );

        const reports =
            reportService
                .getReports()
                .filter(
                    (report) =>
                        report.reporter === uuid ||
                        report.reported === uuid
                );

        res.json({

            user,

            visits,

            reports,

            callHistory:
                historyService.getAllHistory()[uuid] || []

        });

    }
);

// ========================================
// ADMIN SYSTEM HEALTH API
// ========================================

app.get(
    "/api/admin/system-health",
    adminAuth,
    (req, res) => {

        const memory =
            process.memoryUsage();

        const uptime =
            process.uptime();

        const users =
            identityService.getUsers();

        const traffic =
            trafficService.getVisitCount();

        res.json({

            status:
                "healthy",

            uptimeSeconds:
                Math.floor(uptime),

            uptimeHours:
                Number(
                    (
                        uptime / 3600
                    ).toFixed(2)
                ),

            memory: {

                rss:
                    memory.rss,

                heapUsed:
                    memory.heapUsed,

                heapTotal:
                    memory.heapTotal

            },

	activeUsers:
    registerSocketHandlers.getOnlineCount(),

            registeredUsers:
                users.length,

            totalVisits:
                traffic,

            nodeVersion:
                process.version,

            platform:
                process.platform,

            environment:
                process.env.NODE_ENV ||
                "development",

            timestamp:
                new Date().toISOString()

        });

    }
);

// ========================================
// ADMIN ENGAGEMENT API
// ========================================

app.get(
    "/api/admin/engagement",
    adminAuth,
    (req, res) => {

        const users =
            identityService.getUsers();

        const traffic =
            trafficService.getRecentVisits(
                1000
            );

        const reports =
            reportService.getReports();

	let totalCalls = 0;

let totalCallRecords = 0;

const allHistory =
    historyService.getAllHistory();

Object.values(allHistory).forEach(
    (history) => {

        totalCallRecords +=
            history.length;

    }
);

totalCalls =
    Math.floor(
        totalCallRecords / 2
    );

const uniqueVisitors =
    new Set(
        traffic.map(
            (visit) =>
                visit.uuid
        )
    ).size;

	const premiumUsers =
    users.filter(
        (user) =>
            user.isPremium === true
    ).length;

const guests =
    users.filter(
        (user) =>
            user.type === "guest"
    ).length;

const members =
    users.filter(
        (user) =>
            user.type !== "guest"
    ).length;

res.json({

    uniqueVisitors,

    registeredUsers:
        users.length,

    guests,

    members,

    premiumUsers,

    totalVisits:
        traffic.length,

    totalCalls,

    totalCallRecords,

    totalReports:
        reports.length,

    generatedAt:
        new Date().toISOString()

});

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
