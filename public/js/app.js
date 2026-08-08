let dots = 0;
let searchAnimation = null;

const connectionStatus = document.getElementById("connectionStatus");
const homeScreen = document.getElementById("homeScreen");
const searchScreen = document.getElementById("searchScreen");
const callScreen = document.getElementById("callScreen");

const startBtn = document.getElementById("startBtn");
const cancelBtn = document.getElementById("cancelBtn");
const endBtn = document.getElementById("endBtn");
const nextBtn = document.getElementById("nextBtn");
const muteBtn = document.getElementById("muteBtn");
const reportBtn = document.getElementById("reportBtn");

const onlineUsers = document.getElementById("onlineUsers");
const queueCount = document.getElementById("queueCount");
const timer = document.getElementById("timer");

let seconds = 0;
let timerInterval = null;
let isMuted = false;

function showScreen(screen) {

    homeScreen.classList.add("hidden");
    searchScreen.classList.add("hidden");
    callScreen.classList.add("hidden");

    screen.classList.remove("hidden");

}

function resetCallState() {

    cleanupVoice();

    clearInterval(timerInterval);
    clearInterval(searchAnimation);

    seconds = 0;
    timer.textContent = "00:00";

    isMuted = false;
    muteBtn.textContent = "Mute";

}

function startSearchAnimation() {

    const status = document.getElementById("status");

    dots = 0;

    clearInterval(searchAnimation);

    searchAnimation = setInterval(() => {

        dots = (dots + 1) % 4;

        if (status) {

            status.textContent =
                "Finding another Nigerian" + ".".repeat(dots);

        }

    }, 500);

}

socket.on("onlineUsers", (count) => {

    onlineUsers.textContent = count;

});

socket.on("queueCount", (count) => {

    queueCount.textContent = count;

});

startBtn.onclick = () => {

    startBtn.disabled = true;

    showScreen(searchScreen);

    startSearchAnimation();

    socket.emit("joinQueue");

};

cancelBtn.onclick = () => {

    socket.emit("endCall");

    clearInterval(searchAnimation);

    startBtn.disabled = false;

    showScreen(homeScreen);

};

socket.on("matched", () => {

    console.log("🎯 MATCHED");

    connectionStatus.textContent = "Connecting...";

    clearInterval(searchAnimation);

    const status = document.getElementById("status");

    if (status) {
        status.textContent = "Connected!";
    }

    showScreen(callScreen);

    seconds = 0;
    timer.textContent = "00:00";

    clearInterval(timerInterval);

    isMuted = false;
    muteBtn.textContent = "Mute";

    timerInterval = setInterval(() => {

        seconds++;

        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        timer.textContent =
            String(mins).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0");

    }, 1000);

});

endBtn.onclick = () => {

    socket.emit("endCall");

    resetCallState();

    startBtn.disabled = false;

    connectionStatus.textContent = "Disconnected";

    showScreen(homeScreen);

};

nextBtn.onclick = () => {

    socket.emit("endCall");

    resetCallState();

    startBtn.disabled = true;

    connectionStatus.textContent = "Searching...";

    showScreen(searchScreen);

    startSearchAnimation();

    setTimeout(() => {

        socket.emit("joinQueue");

    }, 100);

};

socket.on("callEnded", () => {

    console.log("📞 callEnded received on this device");

    resetCallState();

    connectionStatus.textContent = "Disconnected";

    startBtn.disabled = false;

    alert("The other user ended the call.");

    showScreen(homeScreen);

});

muteBtn.onclick = () => {

    if (!localStream) {

        console.log("🎤 No microphone stream available.");

        return;

    }

    const audioTracks = localStream.getAudioTracks();

    if (audioTracks.length === 0) {

        console.log("❌ No audio track found.");

        return;

    }

    isMuted = !isMuted;

    audioTracks.forEach((track) => {

        track.enabled = !isMuted;

    });

    if (isMuted) {

        muteBtn.textContent = "Unmute";

        debugLog("🔇 MICROPHONE MUTED");

    } else {

        muteBtn.textContent = "Mute";

        debugLog("🎤 MICROPHONE UNMUTED");

    }

};

reportBtn.onclick = () => {

    const choice = prompt(
        "Why are you reporting this user?\\n\\n" +
        "1. Harassment\\n" +
        "2. Sexual or inappropriate behavior\\n" +
        "3. Hate or abusive speech\\n" +
        "4. Spam or scam\\n" +
        "5. Other"
    );

    if (choice === null) {
        return;
    }

    const trimmedChoice = choice.trim();

    const reasons = {
        "1": "Harassment",
        "2": "Sexual or inappropriate behavior",
        "3": "Hate or abusive speech",
        "4": "Spam or scam"
    };

    let reason;

    if (trimmedChoice === "5") {

        const customReason = prompt(
            "Please describe the reason for your report:"
        );

        if (customReason === null) {
            return;
        }

        reason = customReason.trim();

        if (!reason) {

            alert("Please provide a reason for the report.");

            return;
        }

    } else if (reasons[trimmedChoice]) {

        reason = reasons[trimmedChoice];

    } else {

        alert("Please enter a number from 1 to 5.");

        return;
    }

    reportBtn.disabled = true;

    socket.emit("reportUser", reason);

};

socket.on("reportSubmitted", () => {

    reportBtn.disabled = false;

    resetCallState();

    connectionStatus.textContent = "Disconnected";

    startBtn.disabled = false;

    alert(
        "Report submitted. Thank you for helping keep TalkNaija safe."
    );

    showScreen(homeScreen);

});
