import { Envelop } from "../Message/Envelop";

export function from<T>(message: Envelop<T>): Buffer {
    return Buffer.from(JSON.stringify(message), "utf8");
}

export function parse<T>(buffer: Buffer): T {
    return JSON.parse(buffer.toString());
}

export default {
    from,
    parse,
};
