const https = require("https");

function getClientIp(socket) {

    const forwarded =
        socket.handshake.headers["x-forwarded-for"];

    if (forwarded) {

        return forwarded
            .split(",")[0]
            .trim();

    }

    return socket.handshake.address;

}


function isPrivateIp(ip) {

    if (!ip) {
        return true;
    }

    ip = ip.replace(/^::ffff:/, "");

    return (
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        ip.startsWith("172.16.") ||
        ip.startsWith("172.17.") ||
        ip.startsWith("172.18.") ||
        ip.startsWith("172.19.") ||
        ip.startsWith("172.20.") ||
        ip.startsWith("172.21.") ||
        ip.startsWith("172.22.") ||
        ip.startsWith("172.23.") ||
        ip.startsWith("172.24.") ||
        ip.startsWith("172.25.") ||
        ip.startsWith("172.26.") ||
        ip.startsWith("172.27.") ||
        ip.startsWith("172.28.") ||
        ip.startsWith("172.29.") ||
        ip.startsWith("172.30.") ||
        ip.startsWith("172.31.")
    );

}


function lookupCountry(ip) {

    return new Promise((resolve, reject) => {

        const token =
            process.env.IPINFO_TOKEN;

        if (!token) {

            return reject(
                new Error("IPINFO_TOKEN is missing.")
            );

        }

        const request =
            https.get(
                `https://api.ipinfo.io/lite/${ip}?token=${encodeURIComponent(token)}`,
                {
                    timeout: 5000
                },
                (response) => {

                    let data = "";

                    response.on(
                        "data",
                        (chunk) => {
                            data += chunk;
                        }
                    );

                    response.on(
                        "end",
                        () => {

                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {

                                return reject(
                                    new Error(
                                        `IPinfo returned ${response.statusCode}`
                                    )
                                );

                            }

                            try {

                                const result =
                                    JSON.parse(data);

                                resolve(result);

                            } catch (error) {

                                reject(error);

                            }

                        }
                    );

                }
            );

        request.on(
            "timeout",
            () => {

                request.destroy();

                reject(
                    new Error("IPinfo request timed out.")
                );

            }
        );

        request.on(
            "error",
            reject
        );

    });

}


async function checkNigeria(socket) {

    const ip =
        getClientIp(socket);

    /*
    ========================================
    LOCAL DEVELOPMENT
    ========================================
    */

    if (isPrivateIp(ip)) {

        console.log(
            "🌐 Local/private IP detected:",
            ip
        );

        return {
            allowed: true,
            countryCode: "LOCAL",
            ip
        };

    }


    try {

        const result =
            await lookupCountry(ip);

        const countryCode =
            result.country_code || null;

        const allowed =
            countryCode === "NG";

        console.log(
            `🌍 Location check: ${ip} → ${countryCode || "UNKNOWN"} → ${allowed ? "ALLOWED" : "BLOCKED"}`
        );

        return {
            allowed,
            countryCode,
            ip
        };

    } catch (error) {

        console.error(
            "❌ Location lookup failed:",
            error.message
        );

        return {
            allowed: false,
            countryCode: null,
            ip,
            error: true
        };

    }

}


module.exports = {
    checkNigeria
};
