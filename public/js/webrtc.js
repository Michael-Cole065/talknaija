	let localStream = null;
let peerConnection = null;

const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

async function initializeVoice() {

    try {

        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        console.log("🎤 Microphone Ready");

    } catch (err) {

        alert("Please allow microphone access.");

        console.error(err);

    }

}

async function createPeerConnection() {

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach((track) => {

        peerConnection.addTrack(track, localStream);

    });

    peerConnection.onicecandidate = (event) => {

        if (event.candidate) {

            socket.emit("iceCandidate", event.candidate);

        }

    };

    peerConnection.ontrack = (event) => {

        let audio = document.getElementById("remoteAudio");

        if (!audio) {

            audio = document.createElement("audio");

            audio.id = "remoteAudio";
            audio.autoplay = true;
            audio.playsInline = true;

            document.body.appendChild(audio);

        }

        audio.srcObject = event.streams[0];

    };

}

socket.on("offer", async (offer) => {

    if (!peerConnection) {
        await initializeVoice();
        await createPeerConnection();
    }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
    );

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", answer);

});

socket.on("answer", async (answer) => {

    if (!peerConnection) {
        return;
    }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
    );

});

socket.on("iceCandidate", async (candidate) => {

    if (!peerConnection) {
        return;
    }

    try {

        await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
        );

    } catch (err) {

        console.error("ICE candidate error:", err);

    }

});

socket.on("matched", async (data) => {

    if (!data.initiator) {
        return;
    }

    try {

        await initializeVoice();

        await createPeerConnection();

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("offer", offer);

    } catch (err) {

        console.error("WebRTC setup error:", err);

    }

});

function cleanupVoice() {

    if (peerConnection) {

        peerConnection.close();

        peerConnection = null;

    }

    if (localStream) {

        localStream.getTracks().forEach((track) => {

            track.stop();

        });

        localStream = null;

    }

    const remoteAudio = document.getElementById("remoteAudio");

    if (remoteAudio) {

        remoteAudio.srcObject = null;
        remoteAudio.remove();

    }

}
