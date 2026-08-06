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

function showScreen(screen) {

    homeScreen.classList.add("hidden");
    searchScreen.classList.add("hidden");
    callScreen.classList.add("hidden");

    screen.classList.remove("hidden");

}

socket.on("onlineUsers", (count) => {

    onlineUsers.textContent = count;

});

socket.on("queueCount", (count) => {

    queueCount.textContent = count;

});

startBtn.onclick = () => {

    showScreen(searchScreen);
const status = document.getElementById("status");

searchAnimation = setInterval(() => {

    dots = (dots + 1) % 4;

    status.textContent =
        "Finding another Nigerian" + ".".repeat(dots);

},500);
    socket.emit("joinQueue");

};

cancelBtn.onclick = () => {

    showScreen(homeScreen);

};

socket.on("matched", () => {

    connectionStatus.textContent = "Connected";

    clearInterval(searchAnimation);

    showScreen(callScreen);

    seconds = 0;

    clearInterval(timerInterval);

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

    clearInterval(timerInterval);

    showScreen(homeScreen);

};

nextBtn.onclick = () => {

    socket.emit("endCall");

    clearInterval(timerInterval);

    showScreen(searchScreen);

    socket.emit("joinQueue");

};

socket.on("callEnded", () => {

    connectionStatus.textContent = "Disconnected";

    clearInterval(timerInterval);

    alert("The other user ended the call.");

    showScreen(homeScreen);

});

muteBtn.onclick = () => {

    alert("Mute feature coming next.");

};

reportBtn.onclick = () => {

    alert("Report feature coming soon.");

};
