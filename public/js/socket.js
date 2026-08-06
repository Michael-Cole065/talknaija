const socket = io();

socket.on("connect", () => {

    console.log("Socket Connected");

});

socket.on("disconnect", () => {

    console.log("Socket Disconnected");

});
