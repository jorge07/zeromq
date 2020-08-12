import { Annotation, ConsoleRecorder, Tracer } from "zipkin";
import CLSContext from "zipkin-context-cls";

const tracer: Tracer = new Tracer({
    ctxImpl: new CLSContext("zipkin"),
    recorder:  new ConsoleRecorder(),
    localServiceName: "test",
});

const traceID = tracer.createRootId();

tracer.letId(traceID, () => {

    tracer.local("stringufy", () => {
        JSON.stringify({":": {}});
    });
    tracer.recordServiceName("test");
    tracer.recordAnnotation(new Annotation.ClientSend());
});

tracer.letId(traceID, () => {
    tracer.local("parse", () => {
        JSON.parse("{\":\": {}}");
    });
    tracer.recordServiceName("test");
    tracer.recordAnnotation(new Annotation.ClientRecv());
});
