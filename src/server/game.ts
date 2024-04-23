import { Socket } from "socket.io";
import { io } from "./index";

/**
 * Represents an update object with a sender and event details.
 * @typedef {Object} Update
 * @property {string} sender - The sender of the update.
 * @property {Object} event - The event details.
 * @property {string} event.type - The type of the event.
 * @property {any} [event.data] - Optional data associated with the event.
 */
export type Update = {
	sender: string;
	event: {
		type: string;
		data?: any;
	};
}

/**
 * Sends a game update to all clients in a specific room except the sender.
 * @param {Socket} socket - The socket object for the client sending the update.
 * @param {[string, any]} [room, data] - An array containing the room identifier and the data to send.
 * @returns None
 */
export function gameUpdate(socket: Socket, [room, data]) {
	socket.to(room).emit("update", data);
}