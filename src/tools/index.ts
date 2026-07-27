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
import { executePolling } from "./executors/pollingExecutor";
import { callRest } from "./executors/restExecutor";

import { restDnsTool } from './restDnsTool';
import { jsonFormatterTool } from './jsonFormatterTool';
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
    tool: SwissTool,
    inputs: Record<string, any>,
    lang: Language = "fi",
    onProgress?: (progress: number, message?: string) => void
) => {

    let executableTool =
        tool && typeof tool.execute === "string"
            ? hydratePlugin(tool)
            : tool;

    // --- PAKOTETAAN POLLING ZAP-TYÖKALULLE, JOS SITÄ EI LÖYDY ---
    if (executableTool && executableTool.id === "zap-start-scan-fixed-v2") {
        executableTool.executionMode = "poll";
        executableTool.pollConfig = {
            idField: "scan",
            intervalMs: 500,
            timeoutMs: 600000,
            statusEndpoint: "/zap-api/JSON/ascan/view/status/",
            statusParameter: "scanId",
            statusField: "status",
            finishedValue: "100",
            resultEndpoint: "/zap-api/JSON/core/view/alerts/"
        };
    }
    // -------------------------------------------------------------

    console.log("EXECUTE TOOL DEBUG:", executableTool.id, executableTool.executionMode, executableTool.pollConfig);
    
    // ... loppu koodista ennallaan ...
    //--------------------------------------------------
    // LOCAL TOOL
    //--------------------------------------------------

    if (typeof executableTool.execute === "function") {
        try {
            onProgress?.(0, "Starting...");

            const result = await executableTool.execute(
                inputs,
                lang,
                onProgress
            );
            onProgress?.(100, "Completed");
            return result;

        } catch (err: any) {
            return {
                success: false,
                error: "Virhe työkalun suorituksessa: " + err.message
            };
        }
    }

    //--------------------------------------------------
    // REST TOOL
    //--------------------------------------------------

    if (
        executableTool.type === "rest-api" &&
        executableTool.endpoint
    ) {

        try {
            const { apiPath, ...restInputs } = inputs;

            //----------------------------------------------
            // targetUrl -> url
            //----------------------------------------------

            if (restInputs.targetUrl && !restInputs.url) {
                restInputs.url = restInputs.targetUrl;
                delete restInputs.targetUrl;
            }

            //----------------------------------------------
            // Runtime endpoint
            //----------------------------------------------

            let endpoint = executableTool.endpoint;

            if (apiPath) {
                const cleanBase =
                    executableTool.endpoint.replace(/\/+$/, "");
                const cleanPath =
                    apiPath.replace(/^\/+/, "");
                endpoint = `${cleanBase}/${cleanPath}`;
            }

            //----------------------------------------------
            // Runtime tool
            //----------------------------------------------

            const runtimeTool: SwissTool = {
                ...executableTool,
                endpoint
            };

            //----------------------------------------------
            // POLLING EXECUTOR
            //----------------------------------------------
            if (runtimeTool.executionMode === "poll") {
                return await executePolling(
                    runtimeTool,
                    restInputs,
                    onProgress
                );
            }

            //----------------------------------------------
            // NORMAL REST EXECUTOR
            //----------------------------------------------

            onProgress?.(0, "Connecting...");

            const result = await callRest(
                runtimeTool.endpoint!,
                restInputs
            );

            onProgress?.(100, "Completed");
            return {
                success: result.ok,
                data: result.data
            };
        } catch (err: any) {
            return {
                success: false,
                error: "REST API virhe: " + err.message
            };
        }
    }
    //--------------------------------------------------
    // Unsupported tool
    //--------------------------------------------------

    return {
        success: false,
        error:
            lang === "fi"
                ? "Työkalun suoritustapaa ei löytynyt."
                : "Tool execution method not found."
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
  restDnsTool, // Verkko & DNS
  jsonFormatterTool, // Kehitys & data
];