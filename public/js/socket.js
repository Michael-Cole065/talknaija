const socket = io();


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

    }
);


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
