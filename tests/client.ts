import Client from '../src/Transport/Sockets/Client'
import {Response} from "../src/Message/Response";

const cli : Client = new Client([
    'tcp://127.0.0.1:3001',
    'tcp://127.0.0.1:3000',
]);

cli.start();

cli.request({
    path: 'ping',
    body: { wut: '????' },
})
    .then((res: Response) => console.log(res))
;
