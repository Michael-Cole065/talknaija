const fs = require("fs");
const path = require("path");

const reportsFile = path.join(__dirname, "../data/reports.json");

function ensureFile() {

    const directory = path.dirname(reportsFile);

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    if (!fs.existsSync(reportsFile)) {
        fs.writeFileSync(reportsFile, "[]");
    }

}

function getReports() {

    ensureFile();

    try {

        return JSON.parse(
            fs.readFileSync(reportsFile, "utf8")
        );

    } catch (error) {

        console.error("❌ Could not read reports:", error);

        return [];

    }

}

function saveReports(reports) {

    ensureFile();

    fs.writeFileSync(
        reportsFile,
        JSON.stringify(reports, null, 2)
    );

}

function addReport(report) {

    const reports = getReports();

    const newReport = {
        id: Date.now().toString(),
        ...report,
        status: "pending",
        createdAt: new Date().toISOString()
    };

    reports.push(newReport);

    saveReports(reports);

    return newReport;

}

function updateReportStatus(id, status) {

    const reports = getReports();

    const report = reports.find(
        (item) => item.id === id
    );

    if (!report) {
        return null;
    }

    report.status = status;
    report.updatedAt = new Date().toISOString();

    saveReports(reports);

    return report;

}

module.exports = {
    getReports,
    addReport,
    updateReportStatus
};
