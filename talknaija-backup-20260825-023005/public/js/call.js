initializeVoice();

let seconds = 0;
const timer = document.getElementById("timer");

const endBtn = document.getElementById("endBtn");
const muteBtn = document.getElementById("muteBtn");
const reportBtn = document.getElementById("reportBtn");

setInterval(() => {

    seconds++;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    timer.textContent =
        String(mins).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0");

}, 1000);

endBtn.onclick = () => {

    socket.emit("endCall");

    window.location.href = "/";

};

socket.on("callEnded", () => {

    alert("The other user ended the call.");

    window.location.href = "/";

});

muteBtn.onclick = () => {

    alert("Mute feature coming next.");

};

reportBtn.onclick = () => {

    alert("Report feature coming soon.");

};
