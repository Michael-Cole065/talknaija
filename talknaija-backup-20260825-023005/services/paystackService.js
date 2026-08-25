const https = require("https");

function initializeTransaction({
    email,
    amount,
    reference,
    callbackUrl
}) {

    return new Promise((resolve, reject) => {

        const payload = JSON.stringify({
            email,
            amount: String(amount),
            currency: "NGN",
            reference,
            callback_url: callbackUrl
        });

        const request = https.request(
            {
                hostname: "api.paystack.co",
                path: "/transaction/initialize",
                method: "POST",
                headers: {
                    Authorization:
                        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                    "Content-Type":
                        "application/json",

                    "Content-Length":
                        Buffer.byteLength(payload)
                }
            },
            (response) => {

                let body = "";

                response.on(
                    "data",
                    (chunk) => {
                        body += chunk;
                    }
                );

                response.on(
                    "end",
                    () => {

                        try {

                            const data =
                                JSON.parse(body);

                            if (
                                !data.status
                            ) {

                                return reject(
                                    new Error(
                                        data.message ||
                                        "Paystack initialization failed."
                                    )
                                );

                            }

                            resolve(
                                data.data
                            );

                        } catch (error) {

                            reject(error);

                        }

                    }
                );

            }
        );

        request.on(
            "error",
            reject
        );

        request.write(
            payload
        );

        request.end();

    });

}

async function verifyTransaction(
    reference
) {

    return new Promise(
        (resolve, reject) => {

            const options = {

                hostname:
                    "api.paystack.co",

                path:
                    `/transaction/verify/${encodeURIComponent(reference)}`,

                method:
                    "GET",

                headers: {

                    Authorization:
                        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                    "Content-Type":
                        "application/json"

                }

            };


            const request =
                https.request(
                    options,
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

                                try {

                                    const result =
                                        JSON.parse(
                                            data
                                        );


                                    if (
                                        response.statusCode < 200 ||
                                        response.statusCode >= 300
                                    ) {

                                        return reject(
                                            new Error(
                                                result.message ||
                                                "Paystack verification failed."
                                            )
                                        );

                                    }


                                    if (
                                        !result.status ||
                                        !result.data
                                    ) {

                                        return reject(
                                            new Error(
                                                result.message ||
                                                "Invalid Paystack response."
                                            )
                                        );

                                    }


                                    resolve(
                                        result.data
                                    );

                                } catch (error) {

                                    reject(
                                        error
                                    );

                                }

                            }
                        );

                    }
                );


            request.on(
                "error",
                reject
            );

            request.end();

        }
    );

}

module.exports = {
    initializeTransaction,
    verifyTransaction
};

