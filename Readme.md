Zeromq implementations in Typescript
===

## Features

- Automatic workers health-check
- Retry strategy
- Load balancing
- Basic communication protocol
- `async`/`await` 

## Protocol

```typescript
export type Request = {
    body?: any,
    headers?: {} | null,
    path: string,
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
import {Request} from "src/Message/Response";

const server: Worker = new Worker('tcp://127.0.0.1:3000');

server.start((request: Request) => (
    {
        body: 'pong',
        code: 0,
    }
));
```

Connect with the client:
```typescript
import Client from 'src/Transport/Sockets/Client'
import {Response} from "src/Message/Response";
import {Request} from "src/Message/Request";

const cli : Client = new Client([
    'tcp://127.0.0.1:3001',
]);

(async () => {
    try {
        const response: Response = await cli.send({ path: 'ping' });
        console.log(response);
    } catch (err) {
      	console.log(err);
    }
})()
```

Result:
```bash
$ ts-node tests/client
{ uuid: 'f6d41b6a-d12b-4d4d-9fd1-835b4d2e8cf7',
  code: 0,
  body: 'pong' }
```