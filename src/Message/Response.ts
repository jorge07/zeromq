import {Code} from "./Parts/Code";
import {Headers} from "./Parts/Headers";
import {Body} from "./Parts/Body";

export type Response = {
    body?: Body,
    code: Code,
    header?: Headers,
}
