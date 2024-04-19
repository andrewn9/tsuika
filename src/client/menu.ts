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
const socket = io();


function updateRoomList(rooms) {
  const roomList = document.getElementById('room-list');
  roomList.innerHTML = '';

  const roomItems = rooms.map(room => {
    const listItem = document.createElement('li');
    listItem.id = "room";
    listItem.textContent = `Room : ${room.code}, [${room.players}/${room.max}]`;
    return listItem;
  });

  roomList.append(...roomItems);
}


socket.emit("queryRooms");

socket.on('updateRooms', (rooms) => {
  updateRoomList(rooms);
});