import { Envelop } from "../Message/Envelop";

export function fromObject(object: object): Buffer {
    return Buffer.from(JSON.stringify(object), "utf8");
}

export function from<T>(message: Envelop<T>): Buffer {
    return Buffer.from(JSON.stringify(message), "utf8");
}

export function parse<T>(buffer: Buffer): T {
    try {
        return JSON.parse(buffer.toString());
    } catch (e) {
        // tslint:disable-next-line:no-console
      console.log("PARSE ERROR", buffer.toString());
      throw e;
    }
}
