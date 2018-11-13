import { socket, Socket } from "zeromq";
import Timeout = NodeJS.Timeout;
import { EventEmitter } from "events";
import v4 from "uuid/v4";
import Buffering from "../../Buffer";
import envelop from "../../../Message/Envelop";

export const INTERVAL = 3000;

export default class WorkerPool {

    private static connect(address: string): Socket {

        return WorkerPool.client().connect(address);
    }

    private static client(): Socket {
        const cli: Socket = socket("dealer");

        cli.identity = v4();

        return cli;
    }

    private connected: boolean = false;
    private readonly activeWorkers: Set<string> = new Set<string>();
    private readonly timer: Timeout;
    private readonly emitter: EventEmitter;
    private insertCandidates: Set<string> = new Set<string>();
    private readonly servers: Set<string> = new Set<string>();

    constructor(pool: string[] = [], pingInterval: number = INTERVAL) {
        pool.forEach((address) => {
            this.insertCandidates.add(address);
            this.servers.add(address);
        });
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
        this.timer = setInterval(this.health.bind(this), pingInterval);
        this.health();
    }

    public aliveWorkers(): Set<string> {
        return this.activeWorkers;
    }

    public candidates(): Set<string> {
        return this.insertCandidates;
    }

    public workers(): Set<string> {
        return this.servers;
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public populate(addressList: string[]): void {
        this.insertCandidates = new Set<string>(addressList);

        addressList.forEach((address) => this.servers.add(address));

        this.health();
    }

    public onPromote(action: (address: string) => any) {
        this.emitter.on("promoted", action);
    }

    public onConnected(action: (address: string) => any) {
        this.emitter.on("connected", action);
    }

    public onDisconnected(action: (address: string) => any) {
        this.emitter.on("disconnected", action);
    }

    public onDemote(action: (address: string) => any) {
        this.emitter.on("demoted", action);
    }

    public stop(): void {
        clearInterval(this.timer);
        this.insertCandidates.clear();
        this.activeWorkers.clear();
    }

    private health(): void {
        this.insertCandidates.forEach(this.evaluate.bind(this));
        this.activeWorkers.forEach(this.evaluate.bind(this));
    }

    private async evaluate(address: string): Promise<void> {
        try {
            await this.ping(address);
            this.promote(address);
        } catch (error) {
            this.demote(address);
        }
    }

    private promote(address: string): void {
        this.insertCandidates.delete(address);

        if (this.activeWorkers.has(address)) { // Already in activeWorkers
            return;
        }

        this.activeWorkers.add(address);
        this.emitter.emit("promoted", address);

        if (!this.connected && this.activeWorkers.size > 0) {
            this.connected = true;
            this.emitter.emit("connected");
        }
    }

    private demote(address: string): void {
        if (this.insertCandidates.has(address)) {
            this.insertCandidates.delete(address);
        }

        if (! this.servers.has(address)) {
            return;
        }

        this.insertCandidates.add(address);

        if (! this.activeWorkers.has(address)) {
            return;
        }

        this.activeWorkers.delete(address);
        this.emitter.emit("demoted", address);
        if (this.connected && this.activeWorkers.size <= 0) {
            this.connected = false;
            this.emitter.emit("disconnected");
        }
    }

    private async ping(address: string): Promise<boolean> {
        const client: Socket = WorkerPool.connect(address);
        return new Promise<boolean>((resolve, reject) => {
                client.on("message", () => {
                    resolve(true);
                    client.disconnect(address);
                    client.close();
                });

                client.on("error", (err) => {
                    reject(err);
                    client.disconnect(address);
                    client.close();
                });

                setTimeout(() => {reject("Timeout"); }, INTERVAL / 2);

                client.send(
                    [
                        "",
                        Buffering.from(envelop({ path: "ping" }, INTERVAL / 2)),
                    ],
                    0,
                );
            })
        ;
    }

}
