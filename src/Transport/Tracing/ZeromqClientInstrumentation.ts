import {Tracer, Annotation, HttpHeaders, TraceId} from "zipkin";
import {Request} from "../../Message/Request";
import {Response} from "../../Message/Response";
import * as zipkin from "zipkin";
import Some = zipkin.option.Some;
import {Envelop} from "../../Message/Envelop";

export default class ZeromqClientInstrumentation {

    private static getHeader<T>(request: Request, header: string): Some<T> {

        return new Some<T>(request.headers && request.headers[header] ? request.headers[header] : "");
    }

    private static containsRequiredHeaders(request: Envelop<Request>): boolean {
        return ZeromqClientInstrumentation.getHeader<string>(request.message, HttpHeaders.TraceId).getOrElse() !== ""
            && ZeromqClientInstrumentation.getHeader<string>(request.message, HttpHeaders.SpanId).getOrElse() !== "";
    }

    private readonly tracer: Tracer;
    private readonly serviceName: string;
    private readonly remoteServiceName: string;

    constructor(tracer: Tracer, serviceName: string, remoteServiceName: string) {
        this.tracer = tracer;
        this.serviceName = serviceName;
        this.remoteServiceName = remoteServiceName;
    }

    private traceFromHeaders(requestEnvelop: Envelop<Request>): TraceId {
        if (! ZeromqClientInstrumentation.containsRequiredHeaders(requestEnvelop)) {
            return this.tracer.createRootId()
        }

        function stringToBoolean(str: string): boolean {
            return str === '1' || str === 'true';
        }

        function stringToIntOption(str: string): number | undefined {
            try {
                return parseInt(str);
            } catch (err) {
                return undefined;
            }
        }

        const traceId = new TraceId({
            traceId: ZeromqClientInstrumentation.getHeader<string>(requestEnvelop.message, HttpHeaders.TraceId),
            parentId: ZeromqClientInstrumentation.getHeader<string>(requestEnvelop.message, HttpHeaders.ParentSpanId),
            spanId: ZeromqClientInstrumentation.getHeader<string>(requestEnvelop.message, HttpHeaders.SpanId).getOrElse(),
            sampled: ZeromqClientInstrumentation.getHeader<string>(requestEnvelop.message, HttpHeaders.Sampled).map(stringToBoolean),
            flags: ZeromqClientInstrumentation.getHeader<string>(requestEnvelop.message, HttpHeaders.Flags).map(stringToIntOption).getOrElse(0)
        });

        return traceId.parentId ? this.tracer.letId(traceId, () => this.tracer.createChildId()) : traceId;
    }

    private appendZipkinHeaders(requestEnvelop: Envelop<Request>, traceId: TraceId): TraceId {
        requestEnvelop.message.headers[HttpHeaders.TraceId] = traceId.traceId.toString();
        requestEnvelop.message.headers[HttpHeaders.SpanId] = traceId.spanId;

        if (traceId.parentId) {
            requestEnvelop.message.headers[HttpHeaders.ParentSpanId] = traceId.parentId;
        }


        if (traceId.sampled) {
            traceId.sampled.ifPresent(sampled => {
                requestEnvelop.message.headers[HttpHeaders.Sampled] = sampled ? '1' : '0';
            });
        }

        if (traceId.isDebug()) {
            requestEnvelop.message.headers[HttpHeaders.Flags] = '1';
        }

        return traceId;
    }

    private decorateRequest(requestEnvelop: Envelop<Request>): TraceId {
        if (! requestEnvelop.message.headers) {
            requestEnvelop.message.headers = {}
        }

        let id: TraceId = this.traceFromHeaders(requestEnvelop);

        return this.appendZipkinHeaders(requestEnvelop, id);
    }

    public clientRequest(requestEnvelop: Envelop<Request>): TraceId {
        const traceId: TraceId = this.decorateRequest(requestEnvelop);

        this.tracer.letId(traceId, () => {
            this.tracer.recordAnnotation(new Annotation.ClientSend());
            this.tracer.recordRpc(`request:${requestEnvelop.message.path}`);
            this.tracer.recordBinary('zmq.path', requestEnvelop.message.path.toLowerCase());
            this.tracer.recordBinary('zmq.uuid', requestEnvelop.uuid);
            this.tracer.recordAnnotation(new Annotation.ServiceName(this.serviceName));
        });

        return traceId
    }

    public clientResponse(traceId: TraceId, responseEnvelop: Envelop<Response>): void {
        this.tracer.letId(traceId, () => {
            this.tracer.recordAnnotation(new Annotation.ClientRecv());
            this.tracer.recordBinary('zmq.code', responseEnvelop.message.code);
            this.tracer.recordBinary('zmq.uuid', responseEnvelop.uuid);
            this.tracer.recordAnnotation(new Annotation.ServiceName(this.serviceName));
        });
    }

    public local(traceId: TraceId, name: string, action: () => any): any {
        return this.tracer.letId(traceId, () => this.tracer.local(name, action));
    }

    public serverRequest(requestEnvelop: Envelop<Request>): TraceId {
        const traceId: TraceId = this.traceFromHeaders(requestEnvelop);

        this.tracer.scoped(() => {
            this.tracer.letId(traceId, () => {
                this.tracer.recordAnnotation(new Annotation.ServerRecv());
                Object.keys(requestEnvelop.message.headers || []).forEach(
                    value => this.tracer.recordBinary(`zmq.headers:${value}`, requestEnvelop.message.headers[value])
                );
                this.tracer.recordAnnotation(new Annotation.ServiceName(this.serviceName));
                this.tracer.recordRpc(`receive:${requestEnvelop.message.path.toLowerCase()}`);
                this.tracer.recordBinary('zmq.path', requestEnvelop.message.path.toLowerCase());
                this.tracer.recordBinary('zmq.uuid', requestEnvelop.uuid);
            });
        });

        return traceId
    }

    public serverResponse(traceId: TraceId, responseEnvelop: Envelop<Response>): void {
        this.tracer.scoped(() => {
            this.tracer.letId(traceId, () => {
                this.tracer.recordAnnotation(new Annotation.ServerSend());
                this.tracer.recordAnnotation(new Annotation.ServiceName(this.serviceName));
                this.tracer.recordBinary('zmq.code', responseEnvelop.message.code);
                this.tracer.recordBinary('zmq.uuid', responseEnvelop.uuid);
            });
        });
    }

    public timeout(traceId: TraceId, attempt: number, responseEnvelop: Envelop<Request>): void {
        this.tracer.letId(traceId, () => {
            this.tracer.recordRpc('timeout');
            this.tracer.recordBinary('zmq.timeout', responseEnvelop.timeout);
            this.tracer.recordBinary('zmq.attempt', attempt);
            this.tracer.recordBinary('zmq.uuid', responseEnvelop.uuid);
        });
    }
}
