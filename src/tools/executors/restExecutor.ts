// executors/restExecutor.ts

// executors/restExecutor.ts

export interface RestResult {
  ok: boolean;
  status: number;
  data: any;
}

export async function callRest(
  endpoint: string,
  params: Record<string, any> = {},
  method: string = 'GET'
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

  let targetEndpoint = endpoint;
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  // Jos EI olla selaimessa (vaan Node-tausta-ajossa), ohjataan /zap-api suoraan ZAP:lle
  if (!isBrowser) {
    if (targetEndpoint.startsWith("/zap-api")) {
      targetEndpoint = targetEndpoint.replace("/zap-api", "http://localhost:8080");
    } else if (!targetEndpoint.startsWith("http")) {
      targetEndpoint = `http://localhost:8080${targetEndpoint.startsWith("/") ? "" : "/"}${targetEndpoint}`;
    }
  }

  // Määritellään HTTP-metodi heti alussa, jotta se on varmasti käytettävissä
  let httpMethod = method.toUpperCase();
  if (method === 'GET' && targetEndpoint.includes('/action/')) {
    httpMethod = 'POST';
  }

  const query = new URLSearchParams(filtered).toString();

  const finalFetchUrl = 
    httpMethod === 'POST' && query.length > 0 && !targetEndpoint.includes('?')
      ? `${targetEndpoint}?${query}`
      : (query.length > 0 && httpMethod === 'GET' && !targetEndpoint.includes('?') ? `${targetEndpoint}?${query}` : targetEndpoint);

  const postBody = 
    httpMethod === 'POST' && query.length > 0 
      ? query 
      : undefined;

  try {
    const options: RequestInit = {
      method: httpMethod,
    };

    if (httpMethod === 'POST') {
      options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      if (postBody) {
        options.body = postBody;
      }
    }

    const response = await fetch(finalFetchUrl, options);
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