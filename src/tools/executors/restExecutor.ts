// executors/restExecutor.ts

export interface RestResult {
  ok: boolean;
  status: number;
  data: any;
}

export async function callRest(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<RestResult> {

  // Poistetaan tyhjät arvot
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([_, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined
    )
  );

  const query = new URLSearchParams(filtered).toString();

  let targetEndpoint = endpoint;

  // Ohjataan localhost -> Electron proxy
  if (targetEndpoint.startsWith("http://localhost:8080")) {
    targetEndpoint = targetEndpoint.replace(
      "http://localhost:8080",
      "/zap-api"
    );
  }
  else if (!targetEndpoint.startsWith("/zap-api")) {
    targetEndpoint =
      `/zap-api${targetEndpoint.startsWith("/") ? "" : "/"}${targetEndpoint}`;
  }

  const finalUrl =
    query.length > 0
      ? `${targetEndpoint}?${query}`
      : targetEndpoint;

  try {

    const response = await fetch(finalUrl);

    const text = await response.text();

    let parsed: any;

    try {
      parsed = text ? JSON.parse(text) : {};
    }
    catch {
      parsed = { message: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data: parsed
    };

  }
  catch (err: any) {

    return {
      ok: false,
      status: 0,
      data: {
        message: err.message
      }
    };

  }

}