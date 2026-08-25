const socket = io();


/*
==================================================
SOCKET CONNECT
==================================================
*/

socket.on(
    "connect",
    () => {

        console.log(
            "Socket Connected"
        );

        const indicator =
            document.getElementById(
                "connectionIndicator"
            );

        if (indicator) {

            indicator.textContent =
                "🟢 Online";

        }


        /*
        ================================================
        REGISTER USER AFTER SOCKET CONNECTION
        ================================================
        */

        const userId =
            localStorage.getItem(
                "talknaijaUserId"
            );

        const isPremium =
            localStorage.getItem(
                "talknaijaPremium"
            ) === "true";

        const visitTracked =
            sessionStorage.getItem(
                "talknaijaVisitTracked"
            ) === "true";


        if (userId) {

            console.log(
                "🔐 REGISTERING USER:",
                userId
            );

            socket.emit(
                "registerUser",
                {
                    userId,
                    isPremium,
                    isNewVisit:
                        !visitTracked
                }
            );


            if (!visitTracked) {

                sessionStorage.setItem(
                    "talknaijaVisitTracked",
                    "true"
                );

            }

        }

    }
);


/*
==================================================
SOCKET DISCONNECT
==================================================
*/

socket.on(
    "disconnect",
    () => {

        console.log(
            "Socket Disconnected"
        );

        const indicator =
            document.getElementById(
                "connectionIndicator"
            );

        if (indicator) {

            indicator.textContent =
                "🔴 Offline";

        }

    }
);
