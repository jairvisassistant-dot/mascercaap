/**
 * SSE transport probe — TEMPORARY.
 *
 * Purpose: verify that the reverse proxy in front of this Hostinger Node.js
 * app streams Server-Sent Events progressively instead of buffering the whole
 * response, that it survives periods of silence, and that an in-process
 * signal sent from another request reaches an open stream.
 *
 * Delete this file once the spike results are recorded.
 */

export const dynamic = "force-dynamic";

const DURATION_MS = 120_000;
const TICK_MS = 1_000;

/** In-process subscriber list — probe-only, never used outside this file. */
const listeners = new Set<ReadableStreamDefaultController<Uint8Array>>();

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      listeners.add(controller);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "open", t: Date.now() })}\n\n`)
      );

      const tick = setInterval(() => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "tick", t: Date.now() })}\n\n`)
        );
      }, TICK_MS);

      const done = setTimeout(() => {
        clearInterval(tick);
        listeners.delete(controller);
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "close", t: Date.now() })}\n\n`)
          );
          controller.close();
        } catch {
          /* already closed by the client */
        }
      }, DURATION_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(tick);
        clearTimeout(done);
        listeners.delete(controller);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      /* client disconnected */
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Cross-request signal probe: an open stream must receive this event.
 * POST /api/sse-probe?signal=1
 */
export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({ type: "signal", t: Date.now(), from: "post" });

  let delivered = 0;
  for (const controller of listeners) {
    try {
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      delivered += 1;
    } catch {
      listeners.delete(controller);
    }
  }

  return Response.json({ listeners: listeners.size, delivered });
}
