import {socket, Socket} from "zeromq";
import Timeout = NodeJS.Timeout;
import {EventEmitter} from "events";
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
    private activeWorkers: string[] = [];
    private readonly timer: Timeout;
    private readonly emitter: EventEmitter;
    private insertCandidates: string[] = [];
    private servers: string[] = [];

    constructor(pool: string[] = [], pingInterval: number = INTERVAL) {
        this.insertCandidates.push(...pool);
        this.servers.push(...pool);
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
        this.timer = setInterval(this.health.bind(this), pingInterval);
        this.health();
    }

    public aliveWorkers(): string[] {
        return this.activeWorkers;
    }

    public candidates(): string[] {
        return this.insertCandidates;
    }

    public workers(): string[] {
        return this.servers;
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public populate(addressList: string[]): void {
        this.insertCandidates = addressList;
        this.servers = [];
        this.servers.push(...addressList);

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
        this.insertCandidates = [];
        this.activeWorkers = [];
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
        this.insertCandidates.splice(this.insertCandidates.indexOf(address), 1);

        if (this.activeWorkers.indexOf(address) !== -1) { // Already in activeWorkers
            return;
        }

        this.activeWorkers.push(address);
        this.emitter.emit("promoted", address);

        if (!this.connected && this.activeWorkers.length > 0) {
            this.connected = true;
            this.emitter.emit("connected");
        }
    }

    private demote(address: string): void {
        if (this.insertCandidates.indexOf(address) >= 0) {
            this.insertCandidates.splice(this.insertCandidates.indexOf(address), 1);
        }

        if (this.servers.indexOf(address) === -1) {
            return;
        }

        this.insertCandidates.push(address);

        if (this.activeWorkers.indexOf(address) === -1) {
            return;
        }

        delete this.activeWorkers[this.activeWorkers.indexOf(address)];
        this.emitter.emit("demoted", address);
        if (this.connected && this.activeWorkers.length <= 0) {
            this.connected = false;
            this.emitter.emit("disconnected");
        }
    }

    private async ping(address: string): Promise<boolean> {
        let socket: Socket = WorkerPool.connect(address);
        return new Promise<boolean>((resolve, reject) => {
                socket.on("message", () => {
                    resolve(true);
                    socket.disconnect(address);
                    socket.close();
                });

                socket.on("error", (err) => {
                    reject(err);
                    socket.disconnect(address);
                    socket.close();
                });

                setTimeout(() => {reject("Timeout"); }, INTERVAL / 2);

                socket.send([
                    '',
                    Buffering.from(envelop({ path: 'ping' }, INTERVAL / 2))
                ], 0);
            })
        ;
    }

}
