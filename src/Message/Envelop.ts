import v4 from "uuid/v4";
import { Identity } from "./Parts/Identity";

export const TIMEOUT = 5000;

export type Envelop<T> = {
    timeout: number,
    message: T,
} & Identity;

export function envelop<T>(message: T, timeout: number = TIMEOUT): Envelop<T> {
    return {
        message,
        timeout,
        uuid: v4(),
    };
}
