const status = document.getElementById("status");
const cancelBtn = document.getElementById("cancelBtn");

socket.emit("joinQueue");

status.innerHTML = "Searching for another Nigerian...";

socket.on("matched", () => {

status.innerHTML = "🎉 Match Found!";

setTimeout(()=>{

window.location.href="/call.html";

},1500);

});

cancelBtn.onclick=()=>{

window.location.href="/";

};
