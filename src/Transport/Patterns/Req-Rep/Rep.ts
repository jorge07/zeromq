import { Router } from "../Dealer-Router/Router";
import { Envelop } from "../../../Message/Envelop";
import { Response } from "../../../Message/Response";
import * as Buffering from "../../Buffer";
import { Request } from "../../../Message/Request";

export class Rep extends Router {
    constructor(address: string, options: any = {}) {
        super(address, "rep", options);
    }

    protected receive(reducer: (request: Request) => Response): void {
        this.connection.on(
            "message",
            (request: Buffer) => {
                const requestEnvelop: Envelop<Request> = Buffering.parse(request);
                const responseEnvelop: Envelop<Response> = {
                    uuid: requestEnvelop.uuid,
                    timeout: requestEnvelop.timeout,
                    message: {
                        code: 0,
                    },
                };

                switch (true) {
                    case requestEnvelop.message.path === "ping":
                        responseEnvelop.message = { ...responseEnvelop.message, ...Router.pong()};
                        break;
                    default:
                        responseEnvelop.message = { ...responseEnvelop.message, ...reducer(requestEnvelop.message)};
                }

                this.send(responseEnvelop);
            },
        );
    }

    protected send(response: Envelop<Response>): void {
        this.connection.send(Buffering.from(response));
    }
}
