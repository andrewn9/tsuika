type Username = string | null;
const usernameLocal: Username = sessionStorage.getItem("username");
const usernameInput: HTMLInputElement = document.getElementById('username') as HTMLInputElement;

if (usernameLocal) {
	usernameInput.value = usernameLocal;
}

/**
 * Listens for input events on the username input field and stores the entered username
 * in the session storage.
 * @param {Event} event - The input event object.
 * @returns None
 */
usernameInput.addEventListener('input', (event: Event) => {
	const target = event.target as HTMLInputElement;
	sessionStorage.setItem("username", target.value);
});

/**
 * Adds an event listener to the element with the id "create" to handle form submission.
 * Prevents the default form submission behavior, gets the value of the input element with id "room",
 * and redirects the user to a new URL based on the room value.
 * If the room value is empty, it defaults to the username followed by "'s room".
 * @param {Event} event - The event object triggered by the form submission.
 * @returns None
 */
document.getElementById("create")?.addEventListener("submit", (event: Event) => {
	event.preventDefault();
	let room = (document.getElementById("room") as HTMLInputElement).value;
	if (!room) {
		room = usernameInput.value + "'s room";
	}
	window.location.href = "/game.html?room=" + encodeURIComponent(room);
});

import { io } from "socket.io-client";
const socket = io();

/**
 * Updates the room list displayed on the webpage with the provided list of rooms.
 * @param {Array} rooms - An array of room objects containing room information.
 * @returns None
 */
function updateRoomList(rooms) {
	const table = document.getElementById("rooms");

	const existingRooms = table.querySelectorAll("tr.room");
	existingRooms.forEach(room => room.remove());

	rooms.forEach(room => {
		const roomRow = document.createElement("tr");
		roomRow.classList.add("room");

		const roomNameCell = document.createElement("td");
		roomNameCell.textContent = room.roomname || "Could not fetch";

		const hostCell = document.createElement("td");
		hostCell.textContent = room.host || "Could not fetch";

		const playersCell = document.createElement("td");
		playersCell.textContent = room.capacity || "Could not fetch";

		const joinButtonCell = document.createElement("td");
		joinButtonCell.id = "join"
		joinButtonCell.textContent = "Join"
		joinButtonCell.addEventListener("click", () => {
			if (sessionStorage.getItem("username")) {
				window.location.href = "/game.html?room=" + encodeURIComponent(room.roomname);
			} else {
				alert("Please enter a username.")
			}
		});

		roomRow.appendChild(roomNameCell);
		roomRow.appendChild(hostCell);
		roomRow.appendChild(playersCell);
		roomRow.appendChild(joinButtonCell);

		table.appendChild(roomRow);
	});
}

socket.emit("queryRooms");

socket.on('updateRooms', (rooms) => {
	updateRoomList(rooms);
});
let refreshBtn = document.getElementById("refresh") as HTMLButtonElement;

refreshBtn.addEventListener("click", function() {
	socket.emit("queryRooms");
});
