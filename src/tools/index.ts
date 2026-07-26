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

// Apufunktio merkkijonona tallennetun execute-funktion herättämiseen
export function hydratePlugin(plugin: any) {
  let executeFn = plugin.execute;
  if (typeof executeFn === 'string') {
    try {
      // Muutetaan merkkijono ajettavaksi funktioksi
      executeFn = new Function('return ' + plugin.execute)();
    } catch (e) {
      console.error(`Virhe pluginin ${plugin.id} execute-funktion parsinnassa:`, e);
      executeFn = async () => ({ success: false, error: 'Virheellinen execute-funktio' });
    }
  }
  return {
    ...plugin,
    execute: executeFn
  };
}

export const executeSwissTool = async (
  tool: any,
  inputs: Record<string, any>,
  lang: 'fi' | 'en' = 'fi'
) => {
  // 1. Varmistetaan turvallisesti, että plugin on hydratoitu (jos execute on stringinä)
  let executableTool = tool;
  if (tool && typeof tool.execute === 'string') {
    try {
      const fn = new Function('return ' + tool.execute)();
      executableTool = { ...tool, execute: fn };
    } catch (e) {
      console.error('Virhe execute-funktion parsinnassa:', e);
    }
  }

  // 2. Jos työkalulla on validi execute-funktio (esim. paikallinen tai utility-wait), ajetaan se
  if (executableTool && typeof executableTool.execute === 'function') {
    try {
      return await executableTool.execute(inputs, lang);
    } catch (err: any) {
      return { success: false, error: 'Virhe työkalun suorituksessa: ' + err.message };
    }
  }

  // 3. Jos kyseessä on REST-API työkalu (eikä erillistä execute-funktiota ole)
  if (executableTool && executableTool.type === 'rest-api' && executableTool.endpoint) {
    try {
      const { apiPath, ...restInputs } = inputs;

      if (restInputs.targetUrl && !restInputs.url) {
        restInputs.url = restInputs.targetUrl;
        delete restInputs.targetUrl;
      }

      let fullEndpoint = executableTool.endpoint;
      if (apiPath) {
        const cleanBasePath = executableTool.endpoint.replace(/\/+$/, '');
        const cleanApiPath = apiPath.replace(/^\/+/, '');
        fullEndpoint = `${cleanBasePath}/${cleanApiPath}`;
      }

      const filteredInputs = Object.fromEntries(
        Object.entries(restInputs).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      
      const queryParams = new URLSearchParams(filteredInputs);
      const queryParamsString = queryParams.toString();
      
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
    error: lang === 'fi' ? 'Työkalun suoritustapaa (execute tai endpoint) ei löydetty.' : 'Tool execution method not found.' 
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