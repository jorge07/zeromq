import { Body } from "./Parts/Body";
import { Code } from "./Parts/Code";
import { Headers } from "./Parts/Headers";

export type Response = {
    body?: Body,
    code: Code,
    header?: Headers,
};
