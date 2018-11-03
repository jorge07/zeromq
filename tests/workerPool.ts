import WorkerPool from "../src/Transport/Sockets/Pool/WorkerPool";

const pool: WorkerPool = new WorkerPool([
    'tcp://127.0.0.1:3001',
    'tcp://127.0.0.1:3000',
]);