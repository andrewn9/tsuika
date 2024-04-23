import { genBag } from "../client/fruitcfg";
import { gameUpdate } from "./game";
import { io } from "./index";

// Interface definitions for connections and rooms
export interface Connection {
	id: string;	// socket reference
	num: number; // player #
	username: string;
	host: boolean;
}

export interface Room {
	connections: Connection[];
	max_players: number;
	state: string;
	bag?: number[];
}

export const rooms: Map<string, Room> = new Map();

/**
 * Finds the missing number in a given array of numbers. Used for numbering the players.
 * @param {number[]} arr - The array of numbers to search for the missing number.
 * @returns The missing number in the array, or 0 if the array is empty.
 */
function findMissingNumber(arr: number[]): number {
	if (arr.length < 1) {
		return 0;
	}
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] !== i) {
			return i;
		}
	}
	return arr.length;
}

/**
 * Join a room with the given socket, room name, and username.
 * If the room does not exist, it creates a new room with initial settings.
 * If the room is full (2 players), it logs a message and returns.
 * Adds the socket connection to the room with the appropriate player number and username.
 * Emits events to update connections and bag for the room.
 * @param {any} socket - The socket connection to join the room.
 * @param {string} room - The name of the room to join.
 * @param {string} username - The username of the player joining the room.
 * @returns None
 */
export function joinRoom(socket: any, room: string, username: string) {
	if (!rooms.has(room)) { // No room found
		// Create room
		rooms.set(room, {
			connections: [],
			max_players: 2,
			state: "waitingForPlayers",
			bag: genBag(50)
		});
	}

	const roomData = rooms.get(room)!;
	const connections = roomData.connections;
	const gameState = roomData.state;

	// Room is full
	if (connections.length == roomData.max_players) {
		return;
	}

	// Assign player number
	let nums = [] as number[];
	connections.forEach(connection => {
		nums.push(connection.num);
	});

	let pnum = findMissingNumber(nums);
	connections.push({ // Push new connection
		id: socket.id,
		num: pnum,
		username: username,
		host: connections.length == 0
	});

	// Connect to room and send/recieve updates
	socket.join(room);
	io.to(room).emit("connectionAdded", roomData.connections);
	io.to(room).emit("bagUpdate", roomData.bag);
};

/**
 * Retrieves the available rooms along with their details
 * @returns An array of objects containing room details
 */
function getAvailableRooms(): { roomname: string; capacity: string; host: string; state: string }[] {
	const data: { roomname: string; capacity: string; host: string, state: string }[] = [];

	rooms.forEach((roomData, room) => {
		let hostname;
		for (let connection of roomData.connections) {
			if (connection.host)
				hostname = connection.username;
		}
		data.push({
			roomname: room,
			capacity: roomData.connections.length.toString() + "/" + roomData.max_players,
			state: roomData.state,
			host: hostname
		});
	});

	return data;
}

/**
 * Disconnects a player from the game room and performs necessary cleanup actions.
 * @param {object} socket - The socket object representing the player connection.
 * @returns None
 */
const disconnectPlayer = (socket) => {
	rooms.forEach((roomData, room) => {
		const players = roomData.connections;
		const playerIndex = players.findIndex((player) => player.id === socket.id);
		if (playerIndex !== -1) {
			console.log("user disconnected", socket.id);
			rooms.get(room)!.state = "paused";
			players.splice(playerIndex, 1);
			io.to(room).emit("connectionRemoved", players);
			if (players.length === 0) {
				rooms.delete(room);
				console.log(`Room ${room} is empty and has been deleted.`);
			}
		}
	});
};

io.on("connection", (socket) => {
	socket.on("joinRoom", (data) => {
		const room = data.room;
		const username = data.username;
		joinRoom(socket, room, username);
	});

	socket.on("update", (data) => {
		gameUpdate(socket, data);
	});

	socket.on("queryRooms", () => {
		socket.emit('updateRooms', getAvailableRooms());
	});

	socket.on("disconnect", () => {
		disconnectPlayer(socket);
	});
});