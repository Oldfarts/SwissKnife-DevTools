import { SwissTool, Language, getText } from './types';
//import { jwtDecoderTool } from './jwtDecoder';
import { regexTesterTool } from './regexTester';
import { colorConverterTool } from './colorConverter';
import { jsonTools } from './jsonTools';
import { xmlTools } from './xmlTools';
import { jwtTools } from './jwtTools';
import { hashTools } from './hashTools';
import { encoderTools } from './encoderTools';
import { apiTools } from './apiTools';
import { dnsTools } from './dnsTools';
import { fileTools } from './fileTools';
import { sslTools } from './sslTools';
import { qrAnalyzerTool } from './qrAnalyzer';
import { requestReplayTool } from './requestReplayTool';
import { jwtPlaygroundTool } from './jwtPlaygroundTool';
import { apiDiffTool } from './apiDiffTool';
import { logAnalyzerTool } from './logAnalyzerTool';
import { jsonSchemaTool } from './jsonSchemaTool';
import { aiTestGeneratorTool } from './aiTestGeneratorTool';
import { fetchSwaggerTool } from './fetchSwaggerTool';
import { fetchSoapTool } from './fetchSoapTool';
import { aiSoapTestGeneratorTool } from './aiSoapTestGeneratorTool';
import { restUnitTestGeneratorTool } from './restUnitTestGeneratorTool';
import { soapUnitTestGeneratorTool } from './soapUnitTestGeneratorTool';
import { restPythonUnitTestGeneratorTool } from './restPythonUnitTestGeneratorTool';
import { soapPythonUnitTestGeneratorTool } from './soapPythonUnitTestGeneratorTool';
import { WorkflowManager } from './workflowStorage';
import registryData from "../../main/registry.json";

import { REST_DNS_TOOL } from './REST_DNS_TOOL';
import { JSON_FORMATTER_TOOL } from './JSON_FORMATTER_TOOL';
export * from './types';

// Varmistetaan että AVAILABLE_PLUGINS on varmasti taulukko
export const AVAILABLE_PLUGINS: any[] = Array.isArray(registryData) 
  ? registryData 
  : (registryData as any).default || [];

// Määritä tähän ZAP API -avaimesi (jos ZAP vaatii sen)
const ZAP_API_KEY = "rokrokrok"; 

// Apufunktio työkalun suorittamiseen
export const executeSwissTool = async (
  tool: SwissTool,
  inputs: Record<string, any>,
  lang: Language = 'fi'
) => {
  if (tool.type === 'local' && tool.execute) {
    return await tool.execute(inputs, lang);
  }

  if (tool.type === 'rest-api' && tool.endpoint) {
    try {
      const { apiPath, ...restInputs } = inputs;

      // Automaattinen korjaus: ZAP käyttää 'url'-parametria 'targetUrl':n sijaan
      if (restInputs.targetUrl && !restInputs.url) {
        restInputs.url = restInputs.targetUrl;
        delete restInputs.targetUrl;
      }

      let fullEndpoint = tool.endpoint;
      if (apiPath) {
        const cleanBasePath = tool.endpoint.replace(/\/+$/, '');
        const cleanApiPath = apiPath.replace(/^\/+/, '');
        fullEndpoint = `${cleanBasePath}/${cleanApiPath}`;
      }

      // Jos kyseessä on OpenAPI/Swagger import ja käyttäjä antoi raakatekstiä (JSON) URL:n sijaan:
      if (tool.id === 'owasp-zap-import-openapi' && restInputs.url && restInputs.url.trim().startsWith('{')) {
        try {
          // Vaihdetaan endpoint ZAP:n tiedoston tuontiin tai lähetetään POST-pyynnöllä sisäisesti
          // (ZAP hyväksyy usein POST-pyyntöinä dataa, tai voimme luoda väliaikaisen Blob-URL:n / local mockin)
          const blob = new Blob([restInputs.url], { type: 'application/json' });
          const formData = new FormData();
          formData.append('file', blob, 'swagger.json');
          
          // Vaihtoehtoisesti jos ZAP vaatii tiedostopolun, voit tallentaa sen tai käyttää ZAP:n toista rajapintaa.
          // Tässä esimerkissä ohjataan käyttämään ZAP:n file-pohjaista importtia tai käsitellään virhe sirosti.
        } catch (e) {
          // Jatketaan normaalisti, jos ei ollutkaan raakajsonia
        }
      }

      const filteredInputs = Object.fromEntries(
        Object.entries(restInputs).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      
      const queryParams = new URLSearchParams(filteredInputs);

      // Lisätään ZAP API -avain automaattisesti pyyntöön
      if (ZAP_API_KEY) {
        queryParams.append('apikey', ZAP_API_KEY);
      }

      const queryParamsString = queryParams.toString();
      
      // Varmistetaan Vite-proxyn (/zap-api) käyttö ERR_EMPTY_RESPONSE-virheiden välttämiseksi
      let targetEndpoint = fullEndpoint;
      if (targetEndpoint.startsWith('http://localhost:8080')) {
        targetEndpoint = targetEndpoint.replace('http://localhost:8080', '/zap-api');
      } else if (!targetEndpoint.startsWith('/zap-api')) {
        targetEndpoint = `/zap-api${targetEndpoint.startsWith('/') ? '' : '/'}${targetEndpoint}`;
      }

      const finalUrl = queryParamsString ? `${targetEndpoint}?${queryParamsString}` : targetEndpoint;
      
      let response;
      try {
        response = await fetch(finalUrl);
      } catch (networkError) {
        return {
          success: true,
          data: { message: lang === 'fi' ? "Komento lähetetty ZAPille (ajo käynnissä)." : "Command sent to ZAP (execution running)." }
        };
      }

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        data = { message: text };
      }
      
      // 1. Erikoiskäsittely kriittisille hälytyksille (High)
      if (tool.id === 'owasp-zap-critical-alerts') {
        const alerts = data?.alerts || [];
        const criticalAlerts = alerts.filter((alert: any) => alert.risk === 'High');

        if (criticalAlerts.length === 0) {
          return {
            success: true,
            data: { message: lang === 'fi' ? "Ei kriittisiä haavoittuvuuksia (High) löytynyt!" : "No critical vulnerabilities (High) found!" }
          };
        }

        return {
          success: true,
          data: {
            count: criticalAlerts.length,
            criticalAlerts: criticalAlerts.map((a: any) => ({
              name: a.name,
              risk: a.risk,
              url: a.url,
              description: a.description
            }))
          }
        };
      }

      // 2. Erikoiskäsittely kaikille hälytyksille
      if (tool.id === 'owasp-zap-all-alerts') {
        const alerts = data?.alerts || [];

        if (alerts.length === 0) {
          return {
            success: true,
            data: { message: lang === 'fi' ? "Ei hälytyksiä tai haavoittuvuuksia löytynyt." : "No alerts or vulnerabilities found." }
          };
        }

        const formattedAlerts = alerts.map((a: any) => ({
          risk: a.risk,
          name: a.name,
          url: a.url,
          confidence: a.confidence
        }));

        return {
          success: true,
          data: {
            totalCount: alerts.length,
            alerts: formattedAlerts
          }
        };
      }

      return { success: response.ok, data: data || { message: "Suoritettu onnistuneesti" } };
    } catch (err: any) {
      return {
        success: false,
        error: 'REST API virhe: ' + err.message
      };
    }
  }

  return { 
    success: false, 
    error: lang === 'fi' ? 'Työkalun suoritustapaa ei löydetty.' : 'Tool execution method not found.' 
  };
};

// Kootaan kaikki työkalut yhteen taulukkoon
export const ALL_TOOLS: SwissTool[] = [
  ...jsonTools, // kehitys & data
  ...xmlTools, // kehitys & data
  ...apiTools, // kehitys & data
  apiDiffTool, // kehitys & data
  jsonSchemaTool, // kehitys & data
  requestReplayTool, // Verkko & API
  ...jwtTools, // Tietoturva & Auth
  jwtPlaygroundTool,
  ...hashTools, // Tietoturva & Kryptografia
  ...encoderTools, // Kehitys & data
  ...fileTools, // kehitys & data
  qrAnalyzerTool, // Tietoturva & Utilitetit
  logAnalyzerTool, // Tietoturva & Utilitetit
  //jwtDecoderTool,
  regexTesterTool, // Teksti & koodi
  colorConverterTool, // Muotoilu
  ...sslTools, // Verkko
  ...dnsTools,
  aiTestGeneratorTool, // AI & Testaus
  fetchSwaggerTool, // Verkko & API
  fetchSoapTool, // Verkko & API
  aiSoapTestGeneratorTool, // AI & Testaus
  restUnitTestGeneratorTool, // AI & Testaus
  soapUnitTestGeneratorTool, // AI & Testaus
  restPythonUnitTestGeneratorTool, // AI & Testaus
  soapPythonUnitTestGeneratorTool, // AI & Testaus
  REST_DNS_TOOL, // Verkko & DNS
  JSON_FORMATTER_TOOL, // Kehitys & data
];