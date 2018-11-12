import envelop, { Envelop, TIMEOUT } from "../../Message/Envelop";
import { socket, Socket } from "zeromq";
import { Request } from "../../Message/Request";
import { from, parse } from "../Buffer";
import { Response } from "../../Message/Response";
import Timer = NodeJS.Timer;

interface ResolveReject {
    reject(err: any): any;
    resolve(response: Envelop<Response>): any;
    timer: Timer;
}

export default class MicroClient {
    private readonly addresses: Set<string> = new Set<string>();
    private readonly connection: Socket;
    private readonly calls: Map<string, ResolveReject> = new Map<string, ResolveReject>();

    constructor(
        addresses: string[],
        timeout: number = TIMEOUT,
        type: string = "req",
        options: any = {},
    ) {
        addresses.forEach((address) => this.addresses.add(address));
        this.connection = socket(type, options);
    }

    public async request(request: Request): Promise<Response> {

        const envelopRequest: Envelop<Request> = envelop<Request>(request);

        try {
            const envelopResponse: Envelop<Response> = await this.send(envelopRequest);
            return envelopResponse.message;
        } catch (e) {
            throw e;
        }
    }

    public async start(): Promise<MicroClient> {
        this.addresses.forEach((address) => this.connection.connect(address));

        this.connection.monitor();

        return new Promise<MicroClient>((resolve, reject) => {

            const timer = setTimeout(() => {
                reject("Cant connect with any of the addresses");
            },                       TIMEOUT);

            this.connection.on("connect", () => {
                clearTimeout(timer);
                resolve(this);
                this.onMessage();
            });
        });
    }

    public stop(): void {
        this.connection.close();
    }

    private onMessage(): void {
        this.connection.on("message", (msg: Buffer) => {
            const response = parse<Envelop<Response>>(msg);
            const resolver: ResolveReject | undefined = this.calls.get(response.uuid);

            if (! resolver) {
                return; // Ignore
            }

            clearTimeout(resolver.timer);
            resolver.resolve(response);
        });
    }

    private async send(requestEnvelop: Envelop<Request>): Promise<Envelop<Response>> {

        return new Promise<Envelop<Response>>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject("timeout");
            },                       requestEnvelop.timeout);

            this.calls.set(requestEnvelop.uuid, { resolve, reject, timer });

            const msg: Buffer = from(requestEnvelop);

            this.connection.send(msg);
        });
    }
}
