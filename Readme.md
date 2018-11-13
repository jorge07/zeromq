Zeromq implementations in Typescript
===

[![Build Status](https://travis-ci.org/jorge07/zeromq.svg?branch=master)](https://travis-ci.org/jorge07/zeromq)

## Patterns

- Dealer-Router (Brokerless Paranoid Pirate)
- Req-Rep

## Features

- Automatic workers health-check
- Retry strategy
- Load balancing
- `async/await` 

## Protocol

```typescript
export type Request = {
    body?: Body,
    headers?: Headers,
    path: Path,
};
```
```typescript
export type Response = {
    body?: Body,
    code: Code,
    header?: Headers,
};
```

## Usage

Boot the server:

![delaer router](https://i.imgur.com/6BVi4YF.png)

```typescript
import Worker from "src/Transport/Sockets/Worker";

const server: Worker = new Worker("tcp://127.0.0.1:3000");

server.start(() => (
    {
        body: {
            res: "ok",
            worker: process.pid,
        },
        code: 0,
    }
));
```

Connect with the client:
```typescript
import Client from "src/Transport/Sockets/Client";

const cli: Client = new Client([
    "tcp://127.0.0.1:3000",
    "tcp://127.0.0.1:3001",
]);

void (async () => {
    await cli.start();

    try {
        const response: Response = await cli.request({
            body: { wut: "????" },
            path: "ping",
        }, 100);

        console.log(response);

    } catch (e) {
        console.log(e.message);
    }
})();

```

Result:
```bash
$ ts-node tests/client
{ uuid: 'f6d41b6a-d12b-4d4d-9fd1-835b4d2e8cf7',
  code: 0,
  body: 'pong' }
```
