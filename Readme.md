Zeromq implementations in Typescript
===

[![Build Status](https://travis-ci.org/jorge07/zeromq.svg?branch=master)](https://travis-ci.org/jorge07/zeromq)

## Patterns

- Dealer-Router (Brokerless Paranoid Pirate)
- Req-Rep
- Pub-Sub
- Pull-Push

## Features

- Automatic workers health-check
- Retry strategy
- Load balancing
- `async/await` 
- Tracing (Zipkin integration)

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
    headers?: Headers,
};
```

## Dealer architecture

![delaer router](https://i.imgur.com/6BVi4YF.png)

## Usage

Boot the server:

```typescript
import Router from "../src/Transport/Patterns/Dealer-Router/Router";
import {BatchRecorder, Tracer} from "zipkin";
import CLSContext from "zipkin-context-cls";
import {HttpLogger} from "zipkin-transport-http";
import * as zipkin from "zipkin";
import JSON_V2 = zipkin.jsonEncoder.JSON_V2;

const server: Router = new Router(
    "tcp://127.0.0.1:3000",
    "router",
    {},
    new Tracer({
        ctxImpl: new CLSContext('zipkin'),
        recorder: new BatchRecorder({
            logger: new HttpLogger({
                endpoint: 'http://localhost:9411/api/v2/spans',
                jsonEncoder: JSON_V2
            })
        }),
        localServiceName: 'customWorker',
    }),
    'customServer'
);

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
import Dealer from "../src/Transport/Patterns/Dealer-Router/Dealer";
import {BatchRecorder, Tracer} from "zipkin";
import {HttpLogger} from "zipkin-transport-http";
import * as zipkin from "zipkin";
import JSON_V2 = zipkin.jsonEncoder.JSON_V2;
import CLSContext from "zipkin-context-cls"
import {Response} from "../src/Message/Response";

const cli: Dealer = new Dealer(
    [
        "tcp://127.0.0.1:3000",
        "tcp://127.0.0.1:3001",
    ],
    {},
    3,
    3000,
    new Tracer({
        ctxImpl: new CLSContext('zipkin'),
        recorder: new BatchRecorder({
            logger: new HttpLogger({
                endpoint: 'http://localhost:9411/api/v2/spans',
                jsonEncoder: JSON_V2
            })
        }),
        localServiceName: 'client'
    })
);

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

![tracing-dash](https://i.imgur.com/qIDymXH.png)
![tracing-cli](https://i.imgur.com/DSQgWLi.png)
![tracing-server](https://i.imgur.com/lnFJXQk.png)
