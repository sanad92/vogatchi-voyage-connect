interface ApiMeasurement {
  functionName: string;
  method: string;
  status: number | null;
  durationMs: number;
}

type ApiReporter = (measurement: ApiMeasurement) => void;
let apiReporter: ApiReporter | null = null;

export function setApiReporter(reporter: ApiReporter | null) {
  apiReporter = reporter;
}

export function monitoringFetch(apiUrl: string): typeof fetch {
  const origin = new URL(apiUrl).origin;
  return async (input, init) => {
    const reporter = apiReporter;
    if (!reporter) return globalThis.fetch(input, init);

    const url = new URL(input instanceof Request ? input.url : input.toString(), origin);
    const name = url.origin === origin && url.pathname.match(/^\/functions\/v1\/([a-zA-Z0-9_-]{1,100})\/?$/)?.[1];
    if (!name) return globalThis.fetch(input, init);

    const started = performance.now();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const report = (status: number | null) => {
      if (reporter !== apiReporter) return;
      try {
        reporter({ functionName: name, method, status, durationMs: Math.round(performance.now() - started) });
      } catch {
        // Monitoring must not change the outcome of an application request.
      }
    };

    try {
      const response = await globalThis.fetch(input, init);
      report(response.status);
      return response;
    } catch (error) {
      if (init?.signal?.aborted !== true && !(input instanceof Request && input.signal.aborted)
        && !(error instanceof DOMException && error.name === 'AbortError')) report(null);
      throw error;
    }
  };
}
