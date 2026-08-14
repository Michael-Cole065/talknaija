const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dataDir =
    path.join(__dirname, "..", "data");

const supportFile =
    path.join(dataDir, "supportTickets.json");


function ensureStorage() {

    if (!fs.existsSync(dataDir)) {

        fs.mkdirSync(
            dataDir,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(supportFile)) {

        fs.writeFileSync(
            supportFile,
            "[]",
            "utf8"
        );

    }

}


function getTickets() {

    ensureStorage();

    try {

        return JSON.parse(
            fs.readFileSync(
                supportFile,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "Support storage error:",
            error
        );

        return [];

    }

}


function saveTickets(tickets) {

    ensureStorage();

    fs.writeFileSync(
        supportFile,
        JSON.stringify(
            tickets,
            null,
            2
        ),
        "utf8"
    );

}


function createSupportTicket(
    email,
    subject,
    message
) {

    const tickets =
        getTickets();

    const ticket = {

        id:
            "TN-" +
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase(),

        email:
            email.trim(),

        subject:
            subject.trim(),

        message:
            message.trim(),

        status:
            "open",

        createdAt:
            new Date().toISOString(),

        replies: []

    };

    tickets.unshift(
        ticket
    );

    saveTickets(
        tickets
    );

    return ticket;

}


function getAllSupportTickets() {

    return getTickets();

}


module.exports = {
    createSupportTicket,
    getAllSupportTickets
};
