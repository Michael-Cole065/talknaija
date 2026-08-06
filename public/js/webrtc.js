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
