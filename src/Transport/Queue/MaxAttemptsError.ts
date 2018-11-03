export default class MaxAttemptsError extends Error {
    constructor(public readonly uuid: string) {
        super(`Max attempts reached for request ${uuid}`);
    }
}
