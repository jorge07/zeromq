import {Identity} from "./Parts/Identity";
import v4 = require("uuid/v4");

export type Envelop<T> = {
    message: T,
} & Identity;

export default function envelop<T>(message: T): Envelop<T> {
    return {
        uuid: v4(),
        message: message
    }
}