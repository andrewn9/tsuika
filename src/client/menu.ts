type Username = string | null;
const usernameLocal: Username = sessionStorage.getItem("username");
const usernameInput: HTMLInputElement = document.getElementById('username') as HTMLInputElement;

if (usernameLocal) {
  usernameInput.value = usernameLocal;
}

usernameInput.addEventListener('input', (event: Event) => {
  const target = event.target as HTMLInputElement;
  sessionStorage.setItem("username", target.value);
});

document.getElementById("create")?.addEventListener("submit", (event: Event) => {
  event.preventDefault();
  const room = (document.getElementById("room") as HTMLInputElement).value;
  window.location.href = "/game.html?room=" + encodeURIComponent(room);
});

import { io } from "socket.io-client";
import { Room } from "../server/rooms";
import { join } from "path";
const socket = io();


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