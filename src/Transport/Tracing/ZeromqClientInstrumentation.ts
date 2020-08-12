import * as zipkin from "zipkin";
import { Request } from "../../Message/Request";
import { Response } from "../../Message/Response";
import { Envelop } from "../../Message/Envelop";

export class ZeromqClientInstrumentation {

    private static getHeader<T>(request: Request, header: string): zipkin.option.Some<T> {
        return new zipkin.option.Some<T>(request.headers && request.headers[header] ? request.headers[header] : "");
    }

    private static containsRequiredHeaders(request: Envelop<Request>): boolean {
        return ZeromqClientInstrumentation.getHeader<string>(request.message, zipkin.HttpHeaders.TraceId)
                .getOrElse() !== ""
            && ZeromqClientInstrumentation.getHeader<string>(request.message, zipkin.HttpHeaders.SpanId)
                .getOrElse() !== "";
    }

    private readonly tracer: zipkin.Tracer;
    private readonly serviceName: string;
    private readonly remoteServiceName: string;

    constructor(tracer: zipkin.Tracer, serviceName: string, remoteServiceName: string) {
        this.tracer = tracer;
        this.serviceName = serviceName;
        this.remoteServiceName = remoteServiceName;
    }

    private traceFromHeaders(requestEnvelop: Envelop<Request>): zipkin.TraceId {
        if (! ZeromqClientInstrumentation.containsRequiredHeaders(requestEnvelop)) {
            return this.tracer.createRootId();
        }

        function stringToBoolean(str: string): boolean {
            return str === "1" || str === "true";
        }

        function stringToIntOption(str: string): number | undefined {
            try {
                return parseInt(str, 2);
            } catch (err) {
                return undefined;
            }
        }

        const traceId = new zipkin.TraceId({
            traceId: ZeromqClientInstrumentation.getHeader<string>(
                requestEnvelop.message, zipkin.HttpHeaders.TraceId,
            ),
            parentId: ZeromqClientInstrumentation.getHeader<string>(
                requestEnvelop.message, zipkin.HttpHeaders.ParentSpanId,
            ),
            spanId: ZeromqClientInstrumentation.getHeader<string>(
                requestEnvelop.message, zipkin.HttpHeaders.SpanId,
            ).getOrElse(),
            sampled: ZeromqClientInstrumentation.getHeader<string>(
                requestEnvelop.message, zipkin.HttpHeaders.Sampled,
            ).map(stringToBoolean),
            flags: ZeromqClientInstrumentation.getHeader<string>(
                requestEnvelop.message, zipkin.HttpHeaders.Flags,
            ).map(stringToIntOption).getOrElse(0),
        });

        return traceId.parentId ? this.tracer.letId(traceId, () => this.tracer.createChildId()) : traceId;
    }

    private appendZipkinHeaders(requestEnvelop: Envelop<Request>, traceId: zipkin.TraceId): zipkin.TraceId {
        requestEnvelop.message.headers[zipkin.HttpHeaders.TraceId] = traceId.traceId.toString();
        requestEnvelop.message.headers[zipkin.HttpHeaders.SpanId] = traceId.spanId;

        if (traceId.parentId) {
            requestEnvelop.message.headers[zipkin.HttpHeaders.ParentSpanId] = traceId.parentId;
        }

        if (traceId.sampled) {
            traceId.sampled.ifPresent((sampled: boolean) => {
                requestEnvelop.message.headers[zipkin.HttpHeaders.Sampled] = sampled ? "1" : "0";
            });
        }

        if (traceId.isDebug()) {
            requestEnvelop.message.headers[zipkin.HttpHeaders.Flags] = "1";
        }

        return traceId;
    }

    private decorateRequest(requestEnvelop: Envelop<Request>): zipkin.TraceId {
        if (! requestEnvelop.message.headers) {
            requestEnvelop.message.headers = {};
        }

        const id: zipkin.TraceId = this.traceFromHeaders(requestEnvelop);

        return this.appendZipkinHeaders(requestEnvelop, id);
    }

    public clientRequest(requestEnvelop: Envelop<Request>): zipkin.TraceId {
        const traceId: zipkin.TraceId = this.decorateRequest(requestEnvelop);

        this.tracer.letId(traceId, () => {
            this.tracer.recordAnnotation(new zipkin.Annotation.ClientSend());
            this.tracer.recordRpc(`request:${requestEnvelop.message.path}`);
            this.tracer.recordBinary("zmq.path", requestEnvelop.message.path.toLowerCase());
            this.tracer.recordBinary("zmq.uuid", requestEnvelop.uuid);
            this.tracer.recordAnnotation(new zipkin.Annotation.ServiceName(this.serviceName));
        });

        return traceId;
    }

    public clientResponse(traceId: zipkin.TraceId, responseEnvelop: Envelop<Response>): void {
        this.tracer.letId(traceId, () => {
            this.tracer.recordAnnotation(new zipkin.Annotation.ClientRecv());
            this.tracer.recordBinary("zmq.code", responseEnvelop.message.code);
            this.tracer.recordBinary("zmq.uuid", responseEnvelop.uuid);
            this.tracer.recordAnnotation(new zipkin.Annotation.ServiceName(this.serviceName));
        });
    }

    public local(traceId: zipkin.TraceId, name: string, action: () => any): any {
        return this.tracer.letId(traceId, () => this.tracer.local(name, action));
    }

    public serverRequest(requestEnvelop: Envelop<Request>): zipkin.TraceId {
        const traceId: zipkin.TraceId = this.traceFromHeaders(requestEnvelop);

        this.tracer.scoped(() => {
            this.tracer.letId(traceId, () => {
                this.tracer.recordAnnotation(new zipkin.Annotation.ServerRecv());
                Object.keys(requestEnvelop.message.headers || []).forEach(
                    (value: string): void => {
                        this.tracer.recordBinary(`zmq.headers:${value}`, requestEnvelop.message.headers[value]);
                    },
                );
                this.tracer.recordAnnotation(new zipkin.Annotation.ServiceName(this.serviceName));
                this.tracer.recordRpc(`receive:${requestEnvelop.message.path.toLowerCase()}`);
                this.tracer.recordBinary("zmq.path", requestEnvelop.message.path.toLowerCase());
                this.tracer.recordBinary("zmq.uuid", requestEnvelop.uuid);
            });
        });

        return traceId;
    }

    public serverResponse(traceId: zipkin.TraceId, responseEnvelop: Envelop<Response>): void {
        this.tracer.scoped(() => {
            this.tracer.letId(traceId, () => {
                this.tracer.recordAnnotation(new zipkin.Annotation.ServerSend());
                this.tracer.recordAnnotation(new zipkin.Annotation.ServiceName(this.serviceName));
                this.tracer.recordBinary("zmq.code", responseEnvelop.message.code);
                this.tracer.recordBinary("zmq.uuid", responseEnvelop.uuid);
            });
        });
    }

    public timeout(traceId: zipkin.TraceId, attempt: number, responseEnvelop: Envelop<Request>): void {
        this.tracer.letId(traceId, () => {
            this.tracer.recordRpc("timeout");
            this.tracer.recordBinary("zmq.timeout", responseEnvelop.timeout);
            this.tracer.recordBinary("zmq.attempt", attempt);
            this.tracer.recordBinary("zmq.uuid", responseEnvelop.uuid);
        });
    }
}
