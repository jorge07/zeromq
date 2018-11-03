Zeromq implementations in Typescript
===

## Features

- Automatic workers health-check
- Retry strategy
- Load balancing
- Basic communication protocol

## Protocol

```typescript
export type Request = {
    body?: any,
    headers?: {} | null,
    path: string,
    uuid?: string
}
```
```typescript
export type Response = {
    body?: any,
    headers?: {} | null,
    code: number,
}
```

## Usage

Boot the server:

```typescript
import Worker from 'src/Transport/Sockets/Worker';

const server: Worker = new Worker('tcp://127.0.0.1:3000');

console.log('Worker: ', process.pid);

server.start(() => (
    {
        body: {
            res: 'ok',
            worker: process.pid
        },
        code: 0,
    }
));
```

Connect with the client:
```typescript
import Client from 'src/Transport/Sockets/Client'
import {Response} from "src/Envelop/Response";
import {Request} from "src/Envelop/Request";

const cli : Client = new Client([
    'tcp://127.0.0.1:3001',
]);

cli.start((response: Response) => {
    console.log(response);
});

cli.send({
    path: 'ping'
});
```

Result:
```bash
$ ts-node tests/client
Connecting to  tcp://127.0.0.1:3000
{ uuid: 'f6d41b6a-d12b-4d4d-9fd1-835b4d2e8cf7',
  code: 0,
  body: 'pong' }

```