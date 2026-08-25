let localStream = null;
let peerConnection = null;
let pendingCandidates = [];
let microphoneRequest = null;

const CONNECTION_GRACE_PERIOD = 45;

let connectionFailureTimer = null;
let connectionCountdownInterval = null;
let connectionFailureSeconds = 0;
let handlingConnectionFailure = false;

function debugLog(message) {

    console.log(message);

    const box =
        document.getElementById("debugBox");

    if (box) {

        box.innerHTML += message + "<br>";

        box.scrollTop =
            box.scrollHeight;

    }

}

debugLog("🔥 WEBRTC.JS LOADED");


const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        },
        {
            urls: "stun:stun.relay.metered.ca:80"
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "6a9c6c40a06f87f8f9d13bd1",
            credential: "5ZYYPzU1hrUIo/0/"
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "6a9c6c40a06f87f8f9d13bd1",
            credential: "5ZYYPzU1hrUIo/0/"
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "6a9c6c40a06f87f8f9d13bd1",
            credential: "5ZYYPzU1hrUIo/0/"
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "6a9c6c40a06f87f8f9d13bd1",
            credential: "5ZYYPzU1hrUIo/0/"
        }
    ]
};

async function initializeVoice() {

    debugLog("🎤 initializeVoice() STARTED");

    debugLog(
        "📱 mediaDevices: " +
        !!navigator.mediaDevices
    );

    debugLog(
        "🔐 Secure context: " +
        window.isSecureContext
    );

    if (localStream) {
        return localStream;
    }

    if (microphoneRequest) {
        return microphoneRequest;
    }

    debugLog("🎤 Requesting microphone...");

    microphoneRequest =
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

    microphoneRequest
        .then(() => {

            debugLog(
                "✅ getUserMedia RESOLVED"
            );

        })
        .catch((err) => {

            debugLog(
                "❌ getUserMedia ERROR: " +
                err.name
            );

            debugLog(
                "❌ " + err.message
            );

        });

    try {

        localStream =
            await microphoneRequest;

        console.log(
            "🎤 Microphone Ready"
        );

        return localStream;

    } catch (err) {

        alert(
            "Please allow microphone access."
        );

        console.error(err);

        throw err;

    } finally {

        microphoneRequest = null;

    }

}

async function createPeerConnection() {

    if (peerConnection) {
        return;
    }

    peerConnection =
        new RTCPeerConnection(
            rtcConfig
        );

    debugLog(
        "✅ PeerConnection CREATED"
    );

    localStream
        .getTracks()
        .forEach((track) => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

    debugLog(
        "📡 Setting ICE handlers..."
    );

peerConnection.onicecandidate =
    (event) => {

        if (event.candidate) {

            const candidate =
                event.candidate.candidate || "";

            const match =
                candidate.match(
                    / typ ([a-z]+) /
                );

            const candidateType =
                match
                    ? match[1]
                    : "unknown";

            debugLog(
                "🧊 ICE candidate: " +
                candidateType
            );

		debugLog(
		    "🧊 LOCAL ICE: " +
		    candidate
		);

            socket.emit(
                "iceCandidate",
                event.candidate
            );

        }

    };


peerConnection.oniceconnectionstatechange =
    () => {

        if (!peerConnection) {
            return;
        }

        const iceState =
            peerConnection.iceConnectionState;

        debugLog(
            "🧊 ICE STATE: " +
            iceState
        );


        /*
        ================================================
        ICE CONNECTING TIMEOUT
        ================================================
        */

        if (
            iceState === "checking" ||
            iceState === "connected"
        ) {

            if (iceState === "checking") {

                clearTimeout(
                    connectionFailureTimer
                );

                connectionFailureTimer =
                    setTimeout(() => {

                        if (
                            !peerConnection
                        ) {
                            return;
                        }

                        if (
                            peerConnection.iceConnectionState ===
                            "checking"
                        ) {

                            if (
                                connectionStatus
                            ) {

                                connectionStatus.textContent =
                                    "Connection Unstable";

                            }

                            startConnectionCountdown();

                        }

                    }, CONNECTION_GRACE_PERIOD * 1000);

                return;

            }

            if (iceState === "connected") {

                clearTimeout(
                    connectionFailureTimer
                );

                connectionFailureTimer =
                    null;

            }

        }

    };


    peerConnection.onicecandidateerror =
        (event) => {

            debugLog(
                "❌ ICE CANDIDATE ERROR: " +
                event.errorCode +
                " | " +
                event.errorText +
                " | " +
                event.url
            );

        };

    peerConnection.ontrack =
        (event) => {

            debugLog(
                "🎧 REMOTE TRACK RECEIVED"
            );

            const audio =
                document.getElementById(
                    "remoteAudio"
                );

            if (!audio) {

                debugLog(
                    "❌ remoteAudio NOT FOUND"
                );

                return;

            }

            debugLog(
                "🔊 remoteAudio FOUND"
            );

            audio.srcObject =
                event.streams[0];

            audio.muted = false;
            audio.volume = 1.0;

            audio.play()
                .then(() => {

                    debugLog(
                        "✅ REMOTE AUDIO PLAYING"
                    );

                })
                .catch((err) => {

                    debugLog(
                        "❌ PLAY FAILED: " +
                        err.message
                    );

                });

        };

    peerConnection.onconnectionstatechange =
        () => {

            if (!peerConnection) {
                return;
            }

            const state =
                peerConnection.connectionState;

            console.log(
                "🎙️ WebRTC connection:",
                state
            );

            debugLog(
                "🎙️ CONNECTION STATE: " +
                state
            );

            if (state === "connected") {

                handlingConnectionFailure =
                    false;

                clearTimeout(
                    connectionFailureTimer
                );

                clearInterval(
                    connectionCountdownInterval
                );

                connectionFailureTimer =
                    null;

                connectionCountdownInterval =
                    null;

                const countdown =
                    document.getElementById(
                        "connectionCountdown"
                    );

                if (countdown) {
                    countdown.remove();
                }

                if (connectionStatus) {

                    connectionStatus.textContent =
                        "Connected";

                }

		if (
		    typeof socket !== "undefined"
		) {

		    socket.emit(
		        "callConnected"
		    );

		}

            }

            if (state === "disconnected") {

                if (connectionStatus) {

                    connectionStatus.textContent =
                        "Connection Unstable";

                }

                startConnectionCountdown();

            }

if (state === "failed") {

    if (connectionStatus) {

        connectionStatus.textContent =
            "Connection Unstable";

    }

    startConnectionCountdown();

}

            if (state === "closed") {

                clearTimeout(
                    connectionFailureTimer
                );

                clearInterval(
                    connectionCountdownInterval
                );

            }

        };

}

function startConnectionCountdown() {

    clearTimeout(
        connectionFailureTimer
    );

    clearInterval(
        connectionCountdownInterval
    );

    connectionFailureSeconds =
        CONNECTION_GRACE_PERIOD;

    let countdown =
        document.getElementById(
            "connectionCountdown"
        );

    if (!countdown) {

        countdown =
            document.createElement("div");

        countdown.id =
            "connectionCountdown";

        countdown.style.marginTop =
            "8px";

        countdown.style.fontSize =
            "14px";

        countdown.style.textAlign =
            "center";

        countdown.style.opacity =
            "0.8";

        if (
            connectionStatus &&
            connectionStatus.parentNode
        ) {

            connectionStatus.parentNode
                .appendChild(countdown);

        }

    }

    countdown.textContent =
        "Reconnecting... " +
        connectionFailureSeconds +
        "s";

    connectionCountdownInterval =
        setInterval(() => {

            if (handlingConnectionFailure) {

                clearInterval(
                    connectionCountdownInterval
                );

                return;

            }

            connectionFailureSeconds--;

            if (connectionFailureSeconds <= 0) {

                clearInterval(
                    connectionCountdownInterval
                );

                countdown.textContent =
                    "Connection Lost";

                handleConnectionFailure();

                return;

            }

            countdown.textContent =
                "Reconnecting... " +
                connectionFailureSeconds +
                "s";

        }, 1000);

}

function handleConnectionFailure() {

    if (handlingConnectionFailure) {
        return;
    }

    handlingConnectionFailure = true;

    debugLog(
        "❌ WEBRTC CONNECTION FAILED"
    );

    clearTimeout(
        connectionFailureTimer
    );

    clearInterval(
        connectionCountdownInterval
    );

    if (connectionStatus) {

        connectionStatus.textContent =
            "Connection Lost";

    }

    cleanupVoice();

    clearInterval(timerInterval);

    clearInterval(searchAnimation);

    if (startBtn) {
        startBtn.disabled = false;
    }

    showScreen(homeScreen);

}

socket.on("offer", async (offer) => {

    try {

        if (!peerConnection) {

            await initializeVoice();

            await createPeerConnection();

        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                offer
            )
        );

        for (
            const candidate
            of pendingCandidates
        ) {

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    candidate
                )
            );

        }

        pendingCandidates = [];

        const answer =
            await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
            answer
        );

        socket.emit(
            "answer",
            answer
        );

    } catch (err) {

        console.error(
            "Offer handling error:",
            err
        );

    }

});

socket.on("answer", async (answer) => {

    try {

        if (!peerConnection) {
            return;
        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                answer
            )
        );

    } catch (err) {

        console.error(
            "Answer handling error:",
            err
        );

    }

});

socket.on(
    "iceCandidate",
    async (candidate) => {

        try {

            if (!peerConnection) {
                return;
            }

            if (
                !peerConnection.remoteDescription
            ) {

                pendingCandidates.push(
                    candidate
                );

                return;

            }

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    candidate
                )
            );

        } catch (err) {

            console.error(
                "ICE candidate error:",
                err
            );

        }

    }
);

socket.on(
    "matched",
    async (data) => {

        console.log(
            "🎙️ WebRTC matched:",
            data
        );

        try {

            handlingConnectionFailure =
                false;

            clearTimeout(
                connectionFailureTimer
            );

            clearInterval(
                connectionCountdownInterval
            );

            await initializeVoice();

            await createPeerConnection();

            if (!data || !data.initiator) {
                return;
            }

            const offer =
                await peerConnection.createOffer();

            await peerConnection.setLocalDescription(
                offer
            );

            socket.emit(
                "offer",
                offer
            );

        } catch (err) {

            console.error(
                "WebRTC setup error:",
                err
            );

        }

    }
);

function cleanupVoice() {

    clearTimeout(
        connectionFailureTimer
    );

    clearInterval(
        connectionCountdownInterval
    );

    connectionFailureTimer =
        null;

    connectionCountdownInterval =
        null;

    connectionFailureSeconds =
        0;

    handlingConnectionFailure =
        false;

    if (peerConnection) {

        peerConnection.close();

        peerConnection = null;

    }

    if (localStream) {

        localStream
            .getTracks()
            .forEach((track) => {

                track.stop();

            });

        localStream = null;

    }

    pendingCandidates = [];

    const remoteAudio =
        document.getElementById(
            "remoteAudio"
        );

    if (remoteAudio) {

        remoteAudio.srcObject =
            null;

    }

    const countdown =
        document.getElementById(
            "connectionCountdown"
        );

    if (countdown) {
        countdown.remove();
    }

}
