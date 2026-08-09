let dots = 0;
let searchAnimation = null;

const connectionStatus =
    document.getElementById("connectionStatus");

const homeScreen =
    document.getElementById("homeScreen");

const searchScreen =
    document.getElementById("searchScreen");

const callScreen =
    document.getElementById("callScreen");

const startBtn =
    document.getElementById("startBtn");

const cancelBtn =
    document.getElementById("cancelBtn");

const endBtn =
    document.getElementById("endBtn");

const nextBtn =
    document.getElementById("nextBtn");

const muteBtn =
    document.getElementById("muteBtn");

const reportBtn =
    document.getElementById("reportBtn");

const onlineUsers =
    document.getElementById("onlineUsers");

const queueCount =
    document.getElementById("queueCount");

const timer =
    document.getElementById("timer");

const callHistoryList =
    document.getElementById(
        "callHistoryList"
    );

const historyLimitText =
    document.getElementById(
        "historyLimitText"
    );

let seconds = 0;
let timerInterval = null;
let isMuted = false;

/*
==================================================
PERSISTENT ANONYMOUS USER ID
==================================================
*/

let userId =
    localStorage.getItem(
        "talknaijaUserId"
    );

if (!userId) {

    userId =
        crypto.randomUUID();

    localStorage.setItem(
        "talknaijaUserId",
        userId
    );

}

let isPremium =
    localStorage.getItem(
        "talknaijaPremium"
    ) === "true";

/*
==================================================
REGISTER USER
==================================================
*/

socket.emit(
    "registerUser",
    {
        userId,
        isPremium
    }
);

/*
==================================================
SCREEN CONTROL
==================================================
*/

function showScreen(screen) {

    homeScreen.classList.add("hidden");
    searchScreen.classList.add("hidden");
    callScreen.classList.add("hidden");

    screen.classList.remove("hidden");

}

/*
==================================================
CALL RESET
==================================================
*/

function resetCallState() {

    cleanupVoice();

    clearInterval(
        timerInterval
    );

    clearInterval(
        searchAnimation
    );

    seconds = 0;

    timer.textContent =
        "00:00";

    isMuted = false;

    muteBtn.textContent =
        "Mute";

}

/*
==================================================
SEARCH ANIMATION
==================================================
*/

function startSearchAnimation() {

    const status =
        document.getElementById(
            "status"
        );

    dots = 0;

    clearInterval(
        searchAnimation
    );

    searchAnimation =
        setInterval(() => {

            dots =
                (dots + 1) % 4;

            if (status) {

                status.textContent =
                    "Finding another Nigerian" +
                    ".".repeat(dots);

            }

        }, 500);

}

/*
==================================================
CALL HISTORY
==================================================
*/

function loadCallHistory() {

    socket.emit(
        "getCallHistory"
    );

}

function renderCallHistory(history) {

    if (!callHistoryList) {
        return;
    }

    const limit =
        isPremium ? 15 : 5;

    if (historyLimitText) {

        historyLimitText.textContent =
            isPremium
                ? "Your last 15 calls"
                : "Your last 5 calls";

    }

    if (
        !history ||
        history.length === 0
    ) {

        callHistoryList.innerHTML = `
            <p class="history-empty">
                No call history yet.
            </p>
        `;

        return;

    }

    callHistoryList.innerHTML =
        history
            .slice(0, limit)
            .map((call) => {

                const date =
                    new Date(
                        call.timestamp
                    );

                const formattedDate =
                    date.toLocaleString();

                return `

                    <div class="history-item">

                        <div class="history-info">

                            <strong>
                                Anonymous Nigerian
                            </strong>

                            <small>
                                ${formattedDate}
                            </small>

                        </div>

                        <button
                            class="callback-btn"
                            disabled
                        >
                            Call Back
                        </button>

                    </div>

                `;

            })
            .join("");

}

socket.on(
    "callHistory",
    (history) => {

        renderCallHistory(
            history
        );

    }
);

/*
==================================================
ONLINE / QUEUE
==================================================
*/

socket.on(
    "onlineUsers",
    (count) => {

        onlineUsers.textContent =
            count;

    }
);

socket.on(
    "queueCount",
    (count) => {

        queueCount.textContent =
            count;

    }
);

/*
==================================================
START TALKING
==================================================
*/

startBtn.onclick = () => {

    startBtn.disabled =
        true;

    showScreen(
        searchScreen
    );

    startSearchAnimation();

    socket.emit(
        "joinQueue"
    );

};

/*
==================================================
CANCEL SEARCH
==================================================
*/

cancelBtn.onclick = () => {

    socket.emit(
        "endCall"
    );

    clearInterval(
        searchAnimation
    );

    startBtn.disabled =
        false;

    showScreen(
        homeScreen
    );

};

/*
==================================================
MATCHED
==================================================
*/

socket.on(
    "matched",
    () => {

        console.log(
            "🎯 MATCHED"
        );

        connectionStatus.textContent =
            "Connecting...";

        clearInterval(
            searchAnimation
        );

        const status =
            document.getElementById(
                "status"
            );

        if (status) {

            status.textContent =
                "Connected!";

        }

        showScreen(
            callScreen
        );

        seconds = 0;

        timer.textContent =
            "00:00";

        clearInterval(
            timerInterval
        );

        isMuted = false;

        muteBtn.textContent =
            "Mute";

        timerInterval =
            setInterval(() => {

                seconds++;

                const mins =
                    Math.floor(
                        seconds / 60
                    );

                const secs =
                    seconds % 60;

                timer.textContent =
                    String(mins)
                        .padStart(2, "0") +
                    ":" +
                    String(secs)
                        .padStart(2, "0");

            }, 1000);

    }
);

/*
==================================================
END CALL
==================================================
*/

endBtn.onclick = () => {

    socket.emit(
        "endCall"
    );

    resetCallState();

    startBtn.disabled =
        false;

    connectionStatus.textContent =
        "Disconnected";

    loadCallHistory();

    showScreen(
        homeScreen
    );

};

/*
==================================================
NEXT PERSON
==================================================
*/

nextBtn.onclick = () => {

    console.log(
        "⏭️ NEXT PERSON"
    );

    socket.emit(
        "endCall"
    );

    cleanupVoice();

    clearInterval(
        timerInterval
    );

    clearInterval(
        searchAnimation
    );

    seconds = 0;

    if (timer) {

        timer.textContent =
            "00:00";

    }

    startBtn.disabled =
        true;

    showScreen(
        searchScreen
    );

    const status =
        document.getElementById(
            "status"
        );

    if (status) {

        dots = 0;

        status.textContent =
            "Finding another Nigerian";

        clearInterval(
            searchAnimation
        );

        searchAnimation =
            setInterval(() => {

                dots =
                    (dots + 1) % 4;

                status.textContent =
                    "Finding another Nigerian" +
                    ".".repeat(dots);

            }, 500);

    }

    socket.emit(
        "joinQueue"
    );

};

/*
==================================================
CALL ENDED BY OTHER USER
==================================================
*/

socket.on(
    "callEnded",
    () => {

        console.log(
            "📞 callEnded received on this device"
        );

        resetCallState();

        connectionStatus.textContent =
            "Disconnected";

        startBtn.disabled =
            false;

        loadCallHistory();

        alert(
            "The other user ended the call."
        );

        showScreen(
            homeScreen
        );

    }
);

/*
==================================================
MUTE
==================================================
*/

muteBtn.onclick = () => {

    if (!localStream) {

        console.log(
            "🎤 No microphone stream available."
        );

        return;

    }

    const audioTracks =
        localStream.getAudioTracks();

    if (
        audioTracks.length === 0
    ) {

        console.log(
            "❌ No audio track found."
        );

        return;

    }

    isMuted =
        !isMuted;

    audioTracks.forEach(
        (track) => {

            track.enabled =
                !isMuted;

        }
    );

    if (isMuted) {

        muteBtn.textContent =
            "Unmute";

        debugLog(
            "🔇 MICROPHONE MUTED"
        );

    } else {

        muteBtn.textContent =
            "Mute";

        debugLog(
            "🎤 MICROPHONE UNMUTED"
        );

    }

};

/*
==================================================
REPORT
==================================================
*/

reportBtn.onclick = () => {

    const choice =
        prompt(
            "WHY ARE YOU REPORTING THIS USER?\n\n" +
            "1. Harassment\n" +
            "2. Sexual or inappropriate behavior\n" +
            "3. Hate or abusive speech\n" +
            "4. Spam or scam\n" +
            "5. Other"
        );

    if (choice === null) {
        return;
    }

    const selected =
        choice.trim();

    const reasons = {

        "1":
            "Harassment",

        "2":
            "Sexual or inappropriate behavior",

        "3":
            "Hate or abusive speech",

        "4":
            "Spam or scam"

    };

    let reason;

    if (
        selected === "5"
    ) {

        const customReason =
            prompt(
                "Please describe the reason for your report:"
            );

        if (
            customReason === null
        ) {

            return;

        }

        reason =
            customReason.trim();

        if (!reason) {

            alert(
                "Please provide a reason for the report."
            );

            return;

        }

    } else if (
        reasons[selected]
    ) {

        reason =
            reasons[selected];

    } else {

        alert(
            "Please enter a number from 1 to 5."
        );

        return;

    }

    reportBtn.disabled =
        true;

    socket.emit(
        "reportUser",
        reason
    );

};

/*
==================================================
REPORT SUBMITTED
==================================================
*/

socket.on(
    "reportSubmitted",
    () => {

        reportBtn.disabled =
            false;

        resetCallState();

        connectionStatus.textContent =
            "Disconnected";

        startBtn.disabled =
            false;

        loadCallHistory();

        alert(
            "Report submitted. Thank you for helping keep TalkNaija safe."
        );

        showScreen(
            homeScreen
        );

    }
);

/*
==================================================
INITIAL HISTORY LOAD
==================================================
*/

loadCallHistory();
