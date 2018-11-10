export default class ClientNotReady extends Error {
    constructor() {
        super('Client not ready: No workers connected.')
    }
}