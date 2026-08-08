let localStream = null;
let peerConnection = null;
let pendingCandidates = [];
let microphoneRequest = null;

let connectionFailureTimer = null;
let handlingConnectionFailure = false;

function debugLog(message) {

    console.log(message);

    const box =
        document.getElementById("debugBox");

    if (box) {

        box.innerHTML +=
            message + "<br>";

        box.scrollTop =
            box.scrollHeight;

    }

}

debugLog("🔥 WEBRTC.JS LOADED");

const rtcConfig = {

    iceServers: [
        {
            urls:
                "stun:stun.l.google.com:19302"
        }
    ]

};

async function initializeVoice() {

    debugLog(
        "🎤 initializeVoice() STARTED"
    );

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

    debugLog(
        "🎤 Requesting microphone..."
    );

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

                debugLog(
                    "🧊 ICE candidate generated"
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

            const state =
                peerConnection.iceConnectionState;

            debugLog(
                "🧊 ICE STATE: " + state
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

                if (connectionStatus) {

                    connectionStatus.textContent =
                        "Connected";

                }

            }

            if (state === "disconnected") {

                if (connectionStatus) {

                    connectionStatus.textContent =
                        "Connection unstable...";

                }

                clearTimeout(
                    connectionFailureTimer
                );

                connectionFailureTimer =
                    setTimeout(() => {

                        if (
                            peerConnection &&
                            peerConnection.connectionState ===
                                "disconnected"
                        ) {

                            handleConnectionFailure();

                        }

                    }, 5000);

            }

            if (state === "failed") {

                handleConnectionFailure();

            }

            if (state === "closed") {

                clearTimeout(
                    connectionFailureTimer
                );

            }

        };

}

function handleConnectionFailure() {

    if (handlingConnectionFailure) {
        return;
    }

    handlingConnectionFailure = true;

    debugLog(
        "❌ WEBRTC CONNECTION FAILED"
    );

    if (connectionStatus) {

        connectionStatus.textContent =
            "Connection Lost";

    }

    cleanupVoice();

    clearInterval(timerInterval);

    clearInterval(searchAnimation);

    startBtn.disabled = false;

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

    connectionFailureTimer = null;

    handlingConnectionFailure = false;

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

        remoteAudio.srcObject = null;

    }

}
