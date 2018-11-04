import {socket, Socket} from "zeromq";
import Timeout = NodeJS.Timeout;
import {EventEmitter} from "events";
import v4 from "uuid/v4";
import Buffering from "../../Buffer";

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

    private pool: string[] = [];
    private readonly timer: Timeout;
    private readonly emitter: EventEmitter;
    private insertCandidates: string[] = [];
    private servers: string[] = [];

    constructor(pool: string[] = []) {
        this.insertCandidates.push(...pool);
        this.servers.push(...pool);
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
        this.timer = setInterval(this.health.bind(this), INTERVAL);
        this.health();
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

    public onDemote(action: (address: string) => any) {
        this.emitter.on("demoted", action);
    }

    public stop(): void {
        clearInterval(this.timer);
        this.insertCandidates = [];
        this.pool = [];
    }

    private health(): void {
        this.insertCandidates.forEach(this.evaluate.bind(this));
        this.pool.forEach(this.evaluate.bind(this));
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

        if (this.pool.indexOf(address) !== -1) { // Already in pool
            return;
        }

        this.pool.push(address);
        this.emitter.emit("promoted", address);
    }

    private demote(address: string): void {
        if (this.insertCandidates.indexOf(address) >= 0) {
            this.insertCandidates.splice(this.insertCandidates.indexOf(address), 1);
        }

        if (this.servers.indexOf(address) >= 0) {
            return;
        }

        this.insertCandidates.push(address);

        if (this.pool.indexOf(address) < 0) {
            return;
        }

        delete this.pool[this.pool.indexOf(address)];
        this.emitter.emit("demoted", address);
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

                setTimeout(() => {reject("Timeout"); }, 2000);

                socket.send([
                    "",
                    Buffering.from({
                        message: {
                            path: "ping",
                        },
                        uuid: v4(),
                    }),
                ], 0);
            })
        ;
    }

}
