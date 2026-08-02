// executors/soapExecutor.ts

export interface SoapResult {
  ok: boolean;
  status: number;
  data: any;
}

export async function callSoap(
  endpoint: string,
  soapEnvelope: string, // SOAP XML -pyyntö (Envelope)
  soapAction: string = '' // Valinnainen SOAPAction-header
): Promise<SoapResult> {

  let targetEndpoint = endpoint;
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  // Jos ollaan SELAIMESSA, ohjataan http://localhost:8080 -> /zap-api (Viten proxy)
  if (isBrowser) {
    if (targetEndpoint.startsWith("http://localhost:8080")) {
      targetEndpoint = targetEndpoint.replace(
        "http://localhost:8080",
        "/zap-api"
      );
    }
  } else {
    // Jos ollaan NODE-TAUSTA-AJOSSA, varmistetaan että käytetään suoraan porttia 8080
    if (targetEndpoint.startsWith("/zap-api")) {
      targetEndpoint = targetEndpoint.replace("/zap-api", "http://localhost:8080");
    } else if (!targetEndpoint.startsWith("http")) {
      targetEndpoint = `http://localhost:8080${targetEndpoint.startsWith("/") ? "" : "/"}${targetEndpoint}`;
    }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'text/xml; charset=utf-8',
    };

    if (soapAction) {
      headers['SOAPAction'] = `"${soapAction}"`;
    }

    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: headers,
      body: soapEnvelope
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      data: {
        rawXml: text,
        message: response.ok ? 'SOAP-pyyntö suoritettu onnistuneesti' : 'SOAP-virhe vastauksessa'
      }
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