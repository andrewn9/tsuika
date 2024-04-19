import * as express from 'express';
import { Server as HttpServer } from 'http'; 
import { Server as SocketIOServer, Socket } from 'socket.io';

const app: express.Application = express();
const server = require("http").Server(app);
const io: SocketIOServer = require('socket.io')(server);

app.use(express.static('dist'));

export const socket = { io };

require('./rooms'); 

server.listen(3000, () => {
    console.log(`Listening on http://localhost:${3000}`);
});
