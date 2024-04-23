import { genBag } from "../client/fruitcfg";
import { gameUpdate } from "./game";
import { io } from "./index";

export interface Connection {
	id: string;
	num: number;
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

function findMissingNumber(arr: number[]): number {
	if (arr.length < 1) {
		return 0;
	}
	for (let i = 0; i < arr.length; i++) {
		if(arr[i]!==i) {
			return i;
		}
	}
	return arr.length;
}

export function joinRoom(socket: any, room: string, username: string) {
	if (!rooms.has(room)) {
		console.log("creating room " + room);
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

	if (connections.length == 2) {
		console.log("room is full");
		return;
	}
	
	let nums = [] as number[];
	connections.forEach(connection => {
		nums.push(connection.num);
	});

	let pnum = findMissingNumber(nums);
	connections.push({
		id: socket.id,
		num: pnum,
		username: username,
		host: connections.length == 0
	});

	socket.join(room);
	io.to(room).emit("connectionAdded", roomData.connections);
	io.to(room).emit("bagUpdate", roomData.bag);
	console.log("player " + pnum.toString() + " " +username + " joined room", room);
};

function getAvailableRooms(): { roomname: string; capacity: string; host: string; state: string}[] {
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