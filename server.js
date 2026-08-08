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

const app = express();

let server;

if (process.env.NODE_ENV === "production") {

    server = http.createServer(app);

} else {

    const httpsOptions = {
        key: fs.readFileSync("./cert/server.key"),
        cert: fs.readFileSync("./cert/server.crt")
    };

    server = https.createServer(httpsOptions, app);

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
// PROTECT ADMIN PAGE
// ========================================

app.get("/admin-reports.html", adminAuth, (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "admin-reports.html")
    );

});

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
// SERVER
// ========================================

const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `🚀 TalkNaija running on port ${PORT}`
    );

});
