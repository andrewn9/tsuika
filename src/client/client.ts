import { io } from "socket.io-client";

const room = new URLSearchParams(window.location.search).get("room");
if (!room) {
	window.location.href = "/index.html";
}

const username = sessionStorage.getItem("username");

if (!username && room) { // Meh
	window.location.href = "/index.html";
}

const socket = io();
socket.emit("joinRoom", { room, username });
