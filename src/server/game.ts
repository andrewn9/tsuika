import { Socket } from "socket.io";
import { io } from "./index";

export type Update = {
    sender: string;
    event: {
        type: string;
        data?: any;
    };
}

export function gameUpdate(socket: Socket, [room, data]) {
    socket.to(room).emit("update", data);
}