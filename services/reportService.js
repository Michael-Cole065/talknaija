const fs = require("fs");
const path = require("path");
const identityService =
    require("./identityService");

const reportsFile =
    path.join(__dirname, "../data/reports.json");

function ensureFile() {

    const directory =
        path.dirname(reportsFile);

    if (!fs.existsSync(directory)) {

        fs.mkdirSync(
            directory,
            { recursive: true }
        );

    }

    if (!fs.existsSync(reportsFile)) {

        fs.writeFileSync(
            reportsFile,
            "[]"
        );

    }

}

function getReports() {

    ensureFile();

    try {

        return JSON.parse(
            fs.readFileSync(
                reportsFile,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "❌ Could not read reports:",
            error
        );

        return [];

    }

}

function saveReports(reports) {

    ensureFile();

    fs.writeFileSync(
        reportsFile,
        JSON.stringify(
            reports,
            null,
            2
        )
    );

}

function addReport(report) {

    const reports =
        getReports();

    const newReport = {

        id: Date.now().toString(),

        ...report,

        status: "pending",

        blocked: true,

        createdAt:
            new Date().toISOString()

    };

    reports.push(newReport);

    saveReports(reports);

    /*
    ========================================
    AUTOMATIC 5-REPORT BAN
    ========================================
    */

    const reportedUserId =
        newReport.reported;

    if (reportedUserId) {

        const user =
            identityService.getUser(
                reportedUserId
            );

        if (user) {

            const counts =
                getReportCountsByUser();

            const currentCount =
                counts[reportedUserId] || 0;

            identityService.updateReportCount(
                reportedUserId,
                currentCount
            );

            if (
                currentCount >= 5 &&
                user.banned !== true
            ) {

                identityService.setBanned(
                    reportedUserId,
                    true,
                    "Automatic ban after reaching 5 reports"
                );

                console.log(
                    "🔴 AUTOMATIC USER BAN:",
                    reportedUserId,
                    "Reports:",
                    currentCount
                );

            }

        }

    }

    return newReport;

}

function updateReportStatus(
    id,
    status
) {

    const reports =
        getReports();

    const report =
        reports.find(
            (item) =>
                item.id === id
        );

    if (!report) {
        return null;
    }

    report.status = status;

    report.updatedAt =
        new Date().toISOString();

    saveReports(reports);

    return report;

}

function setReportBlocked(
    id,
    blocked
) {

    const reports =
        getReports();

    const report =
        reports.find(
            (item) =>
                item.id === id
        );

    if (!report) {
        return null;
    }

    report.blocked = blocked;

    report.updatedAt =
        new Date().toISOString();

    saveReports(reports);

    return report;

}

function getBlockedPairs() {

    const reports =
        getReports();

    return reports
        .filter(
            (report) =>
                report.blocked === true &&
                report.reporter &&
                report.reported
        )
        .map(
            (report) => ({
                user1:
                    report.reporter,
                user2:
                    report.reported
            })
        );

}

function getReportCountsByUser() {

    const reports =
        getReports();

    const counts = {};

    reports.forEach((report) => {

        if (!report.reported) {
            return;
        }

        const user =
            identityService.getUser(
                report.reported
            );

        if (
            user &&
            user.reportCycleStartedAt &&
            report.createdAt &&
            new Date(report.createdAt) <
            new Date(user.reportCycleStartedAt)
        ) {
            return;
        }

        counts[report.reported] =
            (counts[report.reported] || 0) + 1;

    });

    return counts;
}

function getRedAccounts() {

    const counts =
        getReportCountsByUser();

    const users =
        identityService.getUsers();

    return users
        .filter((user) => {

            if (!user || !user.uuid) {
                return false;
            }

            const reportCount =
                Math.max(
                    counts[user.uuid] || 0,
                    Number(user.reportCount) || 0
                );

            return (
                user.banned === true ||
                reportCount >= 5
            );

        })
        .map((user) => {

            const reportCount =
                Math.max(
                    counts[user.uuid] || 0,
                    Number(user.reportCount) || 0
                );

            return {
                userId:
                    user.uuid,

                reports:
                    reportCount,

                banned:
                    user.banned === true
            };

        });

}

module.exports = {

    getReports,
    addReport,
    updateReportStatus,
    setReportBlocked,
    getBlockedPairs,
    getReportCountsByUser,
    getRedAccounts

};
