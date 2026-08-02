import type { SwissTool, Language } from '../types.ts';
import { callRest } from "./restExecutor.ts";
import { sleep } from "./sleep.ts";

export async function executePolling(
  tool: SwissTool,
  inputs: Record<string, any>,
  onProgress?: (progress: number, message?: string) => void
) {

  if (!tool.pollConfig) {
    return {
      success: false,
      error: "pollConfig missing."
    };
  }

  const config = tool.pollConfig;

  //---------------------------------------
  // Käynnistä työ
  //---------------------------------------

  const start = await callRest(
    tool.endpoint!,
    inputs
  );

  if (!start.ok) {
    return {
      success: false,
      error: "Unable to start operation.",
      data: start.data
    };
  }

  //---------------------------------------
  // Job ID
  //---------------------------------------

  const idField = config.idField ?? "scan";
  const jobId = start.data?.[idField];

  if (!jobId) {
    return {
      success: false,
      error: `Job id '${idField}' not found.`,
      data: start.data
    };
  }

  //---------------------------------------
  // Pollaus
  //---------------------------------------

  const interval = config.intervalMs ?? 1000;
  const timeout = config.timeoutMs ?? 600000;

  const parameter =
    config.statusParameter ?? "scanId";

  const started = Date.now();
  onProgress?.(0, "Starting...");
  let lastStatus: any = null;

  while (true) {
    if (Date.now() - started > timeout) {
      return {
        success: false,
        error: "Polling timeout."
      };
    }

    //---------------------------------------
    // Status
    //---------------------------------------

    const status = await callRest(
      config.statusEndpoint,
      {
        [parameter]: jobId
      }
    );

    if (!status.ok) {
      return {
        success: false,
        error: "Unable to query status.",
        data: status.data
      };
    }
    lastStatus = status.data;

    //---------------------------------------
    // Valmis?
    //---------------------------------------

    const currentStatus =
        String(lastStatus?.[config.statusField]);
    const progress = Number(currentStatus);
    onProgress?.(
        isNaN(progress) ? 0 : progress,
        "Running..."
    );

    if (
      currentStatus ===
      config.finishedValue
    ) {
      onProgress?.(100, "Finished");
      break;
    }
    await sleep(interval);
  }

  //---------------------------------------
  // Lopputulos
  //---------------------------------------

  if (config.resultEndpoint) {
    const result = await callRest(
      config.resultEndpoint,
      {
        [parameter]: jobId
      }
    );
    return {
      success: result.ok,
      data: result.data
    };
  }

  //---------------------------------------
  // Ei result endpointia
  //---------------------------------------

  return {
    success: true,
    data: lastStatus
  };
}