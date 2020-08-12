import { ZeromqClientInstrumentation } from "./ZeromqClientInstrumentation";
import { Request } from "../../Message/Request";
import { Response } from "../../Message/Response";
import { TraceId } from "zipkin";
import { Envelop } from "../../Message/Envelop";

export type TraceRequest = {
    traceId: TraceId
    ok(response: Envelop<Response>): void;
    local(name: string, action: () => any): any;
    timeout(attempt: number, request: Envelop<Request>): void;
};

export type TraceServerRequest = {
    ok(response: Envelop<Response>): void;
    local(name: string, action: () => any): any;
};

export class TracingProxy {
    private readonly instrumentation: ZeromqClientInstrumentation;

    constructor(tracer: any, serviceName: string, remoteServiceName: string) {
        this.instrumentation = new ZeromqClientInstrumentation(tracer, serviceName, remoteServiceName);
    }

    public client(request: Envelop<Request>): TraceRequest {
        const traceId: TraceId = this.instrumentation.clientRequest(request);

        return {
            traceId,
            ok: (response: Envelop<Response>): void => {
                this.instrumentation.clientResponse(traceId, response);
            },
            local: (name: string, action: () => any): void => {
                this.instrumentation.local(traceId, name, action);
            },
            timeout: (attempt: number, currentRequest: Envelop<Request>): void => {
                this.instrumentation.timeout(traceId, attempt, currentRequest);
            },
        };
    }

    public parse(traceId: TraceId, action: () => any): any {
        return this.instrumentation.local(traceId, "parse", action);
    }

    public server(request: Envelop<Request>): TraceServerRequest {
        const traceId: TraceId = this.instrumentation.serverRequest(request);

        return {
            ok: (response: Envelop<Response>): void => {
                this.instrumentation.serverResponse(traceId, response);
            },
            local: (name: string, action: () => any): void => {
                this.instrumentation.local(traceId, name, action);
            },
        };
    }
}
