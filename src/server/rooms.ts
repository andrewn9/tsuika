import { createEngine } from "./game";
import { socket } from "./index";

export interface Player {
	id: string;
	num: number;
	username: string;
}

export interface Room {
	players: Player[];
	max_players: number;
	state: string;
}

export const rooms: Map<string, Room> = new Map();

export function joinRoom(socket: any, room: string, username: string) {
	if (!rooms.has(room)) {
		console.log("creating room " + room);
		rooms.set(room, {
			players: [],
			max_players: 2,
			state: "waitingForPlayers",
		});
		console.log(rooms);
	}

	const roomData = rooms.get(room)!;
	const players = roomData.players;
	const gameState = roomData.state;

	if (players.length == 2) {
		console.log("room is full");
		return;
		// gameState.playersNames?.push(username);
	}
	
	players.push({
		id: socket.id,
		num: players.length,
		username,
	});

	socket.join(room);
	console.log("user joined room", room);
	console.log(roomData.players.length)
};

function getAvailableRooms(): { code: string; players: number; max: number }[] {
	const data: { code: string; players: number; max: number }[] = [];

	rooms.forEach((roomData, room) => {
		data.push({
			code: room,
			players: roomData.players.length,
			max: roomData.max_players,
		});
	});

	return data;
}

const disconnectPlayer = (socket) => {
	rooms.forEach((roomData, room) => {
		const players = roomData.players;
		const playerIndex = players.findIndex((player) => player.id === socket.id);
		if (playerIndex !== -1) {
			console.log("user disconnected", socket.id);
			rooms.get(room)!.state = "paused";
			players.splice(playerIndex, 1);
			if (players.length === 0) {
				rooms.delete(room);
				console.log(`Room ${room} is empty and has been deleted.`);
			}
		}
	});
};

socket.io.on("connection", (socket) => {
	socket.on("joinRoom", (data) => {
		const room = data.room;
		const username = data.username;
		joinRoom(socket, room, username);
	});

	socket.on("queryRooms", () => {
		socket.emit('updateRooms', getAvailableRooms());
	});

	socket.on("disconnect", () => {
		disconnectPlayer(socket);
	});
});