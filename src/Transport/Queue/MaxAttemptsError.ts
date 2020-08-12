export class MaxAttemptsError extends Error {
    public readonly uuid: string;
    constructor(uuid: string) {
        super(`Max attempts reached for request ${uuid}`);
        this.uuid = uuid;
    }
}
