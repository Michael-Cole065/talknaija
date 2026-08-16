const fs = require("fs");
const path = require("path");

const donationFile =
    path.join(__dirname, "../data/donations.json");

function ensureFile() {

    const directory =
        path.dirname(donationFile);

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });
    }

    if (
        !fs.existsSync(donationFile) ||
        fs.statSync(donationFile).size === 0
    ) {
        fs.writeFileSync(
            donationFile,
            "[]"
        );
    }
}

function getDonations() {

    ensureFile();

    try {

        const data =
            fs.readFileSync(
                donationFile,
                "utf8"
            ).trim();

        return data
            ? JSON.parse(data)
            : [];

    } catch (error) {

        console.error(
            "❌ Could not read donations:",
            error
        );

        return [];
    }
}

function saveDonations(
    donations
) {

    ensureFile();

    fs.writeFileSync(
        donationFile,
        JSON.stringify(
            donations,
            null,
            2
        )
    );
}

function recordDonation(
    payment
) {

    if (
        !payment ||
        !payment.reference
    ) {
        return null;
    }

    const donations =
        getDonations();

    const existing =
        donations.find(
            (item) =>
                item.reference ===
                payment.reference
        );

    if (existing) {
        return existing;
    }

    const donation = {

        id:
            `DON-${Date.now()}`,

        reference:
            payment.reference,

        email:
            payment.customer?.email ||
            null,

        amount:
            Number(payment.amount) || 0,

        currency:
            payment.currency ||
            "NGN",

        status:
            payment.status ||
            "unknown",

        paidAt:
            payment.paid_at ||
            null,

        channel:
            payment.channel ||
            null,

        createdAt:
            new Date().toISOString()

    };

    donations.unshift(
        donation
    );

    saveDonations(
        donations
    );

    return donation;
}

function getAllDonations() {
    return getDonations();
}

function getDonationStats() {

    const donations =
        getDonations();

    const successful =
        donations.filter(
            (item) =>
                item.status === "success"
        );

    const totalAmount =
        successful.reduce(
            (sum, item) =>
                sum +
                Number(item.amount || 0),
            0
        );

    return {

        totalDonations:
            successful.length,

        totalAmount,

        currency:
            "NGN",

        donations:
            successful

    };
}

module.exports = {
    recordDonation,
    getAllDonations,
    getDonationStats
};
