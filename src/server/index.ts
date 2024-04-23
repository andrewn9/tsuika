import * as express from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';

const app: express.Application = express();
const server = require("http").Server(app);
export const io: SocketIOServer = require('socket.io')(server);

app.use(express.static('dist'));

require('./rooms'); 

server.listen(3000, () => {
    console.log(`Listening on http://localhost:${3000}`);
});
