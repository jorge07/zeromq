import { socket, Socket } from "zeromq";
import { Request } from "../../../Message/Request";

export class Push {
    private readonly connection: Socket;
    private readonly address: string;

    constructor(address: string = "tcp://*:5555", options = {}) {
        this.connection = socket("push", options);
        this.connection.bindSync(address);
        this.address = address;
    }

    public publish(req: Request) {
        this.connection.send(JSON.stringify(req));
    }

    public stop(): void {
        this.connection.unbindSync(this.address);
        this.connection.close();
    }
}