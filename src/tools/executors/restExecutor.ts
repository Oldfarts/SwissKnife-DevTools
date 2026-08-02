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

  // Ohjataan localhost -> Vite proxy
// Ohjataan proxy-osoitteet suoraan ZAP:lle, jos ollaan Node-ympäristössä tai jos halutaan suora yhteys
  if (targetEndpoint.startsWith("/zap-api")) {
    targetEndpoint = targetEndpoint.replace("/zap-api", "http://localhost:8080");
  } else if (!targetEndpoint.startsWith("http")) {
    targetEndpoint = `http://localhost:8080${targetEndpoint.startsWith("/") ? "" : "/"}${targetEndpoint}`;
  }

  let httpMethod = method.toUpperCase();
  if (method === 'GET' && targetEndpoint.includes('/action/')) {
    httpMethod = 'POST';
  }

  const query = new URLSearchParams(filtered).toString();

  // Jos kyseessä on GET, parametrit laitetaan URL:iin. 
  // Jos kyseessä on POST, ZAP ottaa action-reiteissä parametrit vastaan joko URL:ssa tai body-muodossa. 
  // Turvallisin tapa ZAP:lle on lähettää POST-pyynnössä parametrit URL-parametreina ja oikea Content-Type.
  const fetchUrl =
    query.length > 0 && httpMethod === 'GET' && !targetEndpoint.includes('?')
      ? `${targetEndpoint}?${query}`
      : targetEndpoint;

  const postBody = 
    httpMethod === 'POST' && query.length > 0 
      ? query 
      : undefined;

  // Jos POST käytetään, voimme laittaa parametrit myös queryyn tai bodysiin. 
  // ZAP:n /action/-reitit hyväksyvät ne query-stringinä, kunhan Content-Type on x-www-form-urlencoded tai puuttuu.
  const finalFetchUrl = 
    httpMethod === 'POST' && query.length > 0 && !targetEndpoint.includes('?')
      ? `${targetEndpoint}?${query}`
      : targetEndpoint;

  try {
    const options: RequestInit = {
      method: httpMethod,
    };

    // Jos kyseessä on POST, annetaan ZAP:lle sen vaatima form-urlencoded tyyppi tai ei mitään
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