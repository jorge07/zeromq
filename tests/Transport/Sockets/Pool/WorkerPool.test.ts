import Router from "../../../../src/Transport/Patterns/Dealer-Router/Router";
import WorkerPool from "../../../../src/Transport/Sockets/Pool/WorkerPool";
import {TIMEOUT} from "../../../../src/Message/Envelop";

const ADDRESS = "tcp://127.0.0.1:5555";
const ADDRESS_1 = "tcp://127.0.0.1:5556";
const ADDRESS_2 = "tcp://127.0.0.1:5557";

const startRouter: (address: string) => Router = (address: string): Router => {
    const router = new Router(address);

    router.start(() => {
        return {
            code: 1,
        };
    });

    return router;
};


test('should be able to send a `connected` event when a worker respond to ping', () => {
    const router  = startRouter(ADDRESS);

    const pool: WorkerPool = new WorkerPool();
    return new Promise((resolve, reject) => {

        expect(pool.isConnected()).toBe(false);
        pool.populate([ADDRESS]);
        expect(pool.isConnected()).toBe(false);

        pool.onConnected(resolve);
        pool.onDisconnected(reject);
    }).then(() => {
        router.stop();
    });
});


test('should be able to send a `promote` event when a worker respond to ping', () => {
    const router  = startRouter(ADDRESS_1);

    const pool: WorkerPool = new WorkerPool();
    return new Promise((resolve, reject) => {
        pool.populate([ADDRESS_1]);
        pool.onPromote(resolve);
        pool.onDemote(reject);
    }).then(() => {
        router.stop();
    });;
});

test('should be able to send a `demote` event when a worker STOP responding to a ping', () => {
    const router  = startRouter(ADDRESS_2);

    const pool: WorkerPool = new WorkerPool([], 200);
    return new Promise((resolve, reject) => {
        pool.populate([ADDRESS_2]);
        pool.onPromote((address) => {
            expect(pool.workers()).toContain(address);
            expect(pool.aliveWorkers()).toContain(address);
            router.stop();
            setTimeout(reject, TIMEOUT);
        });
        pool.onDemote((address) => {
            expect(pool.aliveWorkers()).not.toContain(address);
            expect(pool.candidates()).toContain(address);
            resolve()
        });
    });
});
