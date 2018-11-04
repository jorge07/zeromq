import v4 from "uuid/v4";
import {Identity} from "./Parts/Identity";

export type Envelop<T> = {
    message: T,
} & Identity;

export default function envelop<T>(message: T): Envelop<T> {
    return {
        message,
        uuid: v4(),
    };
}
