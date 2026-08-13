import type { SwissTool, Language } from './types.ts';
import { regexTesterTool } from './regexTester.ts';
import { colorConverterTool } from './colorConverter.ts';
import { jsonTools } from './jsonTools.ts';
import { xmlTools } from './xmlTools.ts';
import { jwtTools } from './jwtTools.ts';
import { hashTools } from './hashTools.ts';
import { encoderTools } from './encoderTools.ts';
import { apiTools } from './apiTools.ts';
import { dnsTools } from './dnsTools.ts';
import { fileTools } from './fileTools.ts';
import { sslTools } from './sslTools.ts';
import { qrAnalyzerTool } from './qrAnalyzer.ts';
import { requestReplayTool } from './requestReplayTool.ts';
import { jwtPlaygroundTool } from './jwtPlaygroundTool.ts';
import { apiDiffTool } from './apiDiffTool.ts';
import { logAnalyzerTool } from './logAnalyzerTool.ts';
import { jsonSchemaTool } from './jsonSchemaTool.ts';
import { aiTestGeneratorTool } from './aiTestGeneratorTool.ts';
import { fetchSwaggerTool } from './fetchSwaggerTool.ts';
import { fetchSoapTool } from './fetchSoapTool.ts';
import { aiSoapTestGeneratorTool } from './aiSoapTestGeneratorTool.ts';
import { restUnitTestGeneratorTool } from './restUnitTestGeneratorTool.ts';
import { soapUnitTestGeneratorTool } from './soapUnitTestGeneratorTool.ts';
import { restPythonUnitTestGeneratorTool } from './restPythonUnitTestGeneratorTool.ts';
import { soapPythonUnitTestGeneratorTool } from './soapPythonUnitTestGeneratorTool.ts';
import { WorkflowManager } from './workflowStorage.ts';
// Tähän (käytetään with { type: "json" } tai assert { type: "json" }):
import registryData from "../../main/registry.json" with { type: "json" };
import { executePolling } from "./executors/pollingExecutor.ts";
import { callRest } from "./executors/restExecutor.ts";
import { restDnsTool } from './restDnsTool.ts';
import { jsonFormatterTool } from './jsonFormatterTool.ts';
import { playwrightTestTool } from '../tools/playwright/playwrightTestTool.ts';

export * from './types.ts';

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
    // Haetaan työkalu rekisteristä, jos sille on annettu vain ID tai siitä puuttuu suoritustapa
    let resolvedTool = tool;
    const toolId = typeof tool === "string" ? tool : tool?.id;
    if (toolId) {
        const found = AVAILABLE_PLUGINS.find((p: any) => p.id === toolId);
        if (found) {
            resolvedTool = { ...found, ...(typeof tool === "object" ? tool : {}) };
        }
    }

    let executableTool =
        resolvedTool && typeof resolvedTool.execute === "string"
            ? hydratePlugin(resolvedTool)
            : resolvedTool;

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
  ...jsonSchemaTool, // kehitys & data
  ...requestReplayTool, // Verkko & API
  ...jwtTools, // Tietoturva & Auth
  ...jwtPlaygroundTool,
  ...hashTools, // Tietoturva & Kryptografia
  ...encoderTools, // Kehitys & data
  ...fileTools, // kehitys & data
  ...qrAnalyzerTool, // Tietoturva & Utilitetit
  ...logAnalyzerTool, // Tietoturva & Utilitetit
  ...regexTesterTool, // Teksti & koodi
  ...colorConverterTool, // Muotoilu
  ...sslTools, // Verkko
  ...dnsTools,
  ...aiTestGeneratorTool, // AI & Testaus
  ...fetchSwaggerTool, // Verkko & API
  ...fetchSoapTool, // Verkko & API
  ...aiSoapTestGeneratorTool, // AI & Testaus
  ...restUnitTestGeneratorTool, // AI & Testaus
  ...soapUnitTestGeneratorTool, // AI & Testaus
  ...restPythonUnitTestGeneratorTool, // AI & Testaus
  soapPythonUnitTestGeneratorTool, // AI & Testaus
  ...restDnsTool, // Verkko & DNS
  ...jsonFormatterTool, // Kehitys & data
  ...playwrightTestTool, // Verkko & Testaus
];