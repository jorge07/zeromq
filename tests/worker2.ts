import Worker from '../src/Transport/Sockets/Worker';
import {Request} from "../src/Message/Request";

const server: Worker = new Worker('tcp://127.0.0.1:3001');

console.log('Worker: ', process.pid);

server.start((request: Request) => (
    {
        body: {
            res: 'ok',
            worker: process.pid
        },
        code: 0,
    }
));
