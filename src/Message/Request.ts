import { Body } from "./Parts/Body";
import { Headers } from "./Parts/Headers";
import { Path } from "./Parts/Path";

export type Request = {
    body?: Body,
    headers?: Headers,
    path: Path,
};
