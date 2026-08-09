export interface AgentStrategy {
  useAlternativeIndices: boolean;
  extraWaitTime: number;
  maxWaitTime: number;
  inspectDom: boolean;
  retryDelayMs: number;
  expectAdditionalStabilityDelay: boolean;
}

export interface FailureAnalysis {
  updatedStrategy: AgentStrategy;
  reason: string;
  shouldRetry: boolean;
  suggestedAction: string;
}

export interface UISnapshot {
  context: string;
  count: number;
  elements: Array<{
    role: string;
    text: string;
    name: string;
    value: string;
  }>;
}

export const DEFAULT_AGENT_STRATEGY: AgentStrategy = {
  useAlternativeIndices: false,
  extraWaitTime: 3000,
  maxWaitTime: 12000,
  inspectDom: true,
  retryDelayMs: 4000,
  expectAdditionalStabilityDelay: false,
};

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error ?? '').toLowerCase();
}

export function analyzeFailure(error: unknown, previousStrategy: AgentStrategy): FailureAnalysis {
  const normalized = normalizeError(error);
  const updatedStrategy: AgentStrategy = { ...previousStrategy };

  if (normalized.includes('timeout') || normalized.includes('waitfor') || normalized.includes('visible')) {
    updatedStrategy.useAlternativeIndices = true;
    updatedStrategy.extraWaitTime = Math.min(previousStrategy.extraWaitTime + 3000, previousStrategy.maxWaitTime);
    updatedStrategy.inspectDom = true;
    updatedStrategy.retryDelayMs = Math.max(previousStrategy.retryDelayMs, 5000);
    updatedStrategy.expectAdditionalStabilityDelay = true;

    return {
      updatedStrategy,
      reason: 'Elementti jäi näkyväksi liian hitaasti, joten lisätään odotusta ja dynaamisempia etsintästrategioita.',
      shouldRetry: true,
      suggestedAction: 'Pidennä odotusta ja yritä uudelleen vaihtoehtoisilla elementtivalinnoilla.',
    };
  }

  if (normalized.includes('locator') || normalized.includes('not found') || normalized.includes('no node') || normalized.includes('element')) {
    updatedStrategy.useAlternativeIndices = true;
    updatedStrategy.extraWaitTime = Math.min(previousStrategy.extraWaitTime + 2000, previousStrategy.maxWaitTime);
    updatedStrategy.inspectDom = true;
    updatedStrategy.retryDelayMs = Math.max(previousStrategy.retryDelayMs, 4000);

    return {
      updatedStrategy,
      reason: 'Elementtiä ei löytynyt annetulla kuvauksella, joten siirrytään vaihtoehtoisiin hakutapoihin.',
      shouldRetry: true,
      suggestedAction: 'Etsi sama elementti uudelleen käytettävissä olevista näkyvistä vaihtoehdoista.',
    };
  }

  if (normalized.includes('target closed') || normalized.includes('browser') || normalized.includes('closed')) {
    updatedStrategy.extraWaitTime = Math.min(previousStrategy.extraWaitTime + 1000, previousStrategy.maxWaitTime);
    updatedStrategy.retryDelayMs = Math.max(previousStrategy.retryDelayMs, 6000);

    return {
      updatedStrategy,
      reason: 'Selaimen sessio sulkeutui odottamatta, joten annetaan hetki aikaa ennen uudelleenyritystä.',
      shouldRetry: true,
      suggestedAction: 'Odota hetki ja käynnistä uusi yritys puhtaassa selaimen istunnossa.',
    };
  }

  updatedStrategy.extraWaitTime = Math.min(previousStrategy.extraWaitTime + 1000, previousStrategy.maxWaitTime);
  updatedStrategy.retryDelayMs = Math.max(previousStrategy.retryDelayMs, 3500);

  return {
    updatedStrategy,
    reason: 'Virhe oli epäselvä, joten lisätään hieman odotusta ja yritetään uudelleen.',
    shouldRetry: true,
    suggestedAction: 'Yritetään uudelleen hieman pidemmällä odotusajalla.',
  };
}

export async function inspectUi(page: any, context = ''): Promise<UISnapshot> {
  const elements = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button, input, textarea, select, [role="button"], [role="combobox"], [role="textbox"]'));

    return candidates.slice(0, 20).map((element) => {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      const role = htmlElement.getAttribute('role') || htmlElement.tagName.toLowerCase();

      return {
        role,
        text: (htmlElement.textContent || '').replace(/\s+/g, ' ').trim(),
        name: htmlElement.getAttribute('aria-label') || htmlElement.getAttribute('title') || '',
        value: (htmlElement instanceof HTMLInputElement || htmlElement instanceof HTMLTextAreaElement || htmlElement instanceof HTMLSelectElement)
          ? htmlElement.value
          : '',
        visible,
      };
    }).filter((item) => item.visible && (item.text || item.name || item.value));
  });

  return {
    context,
    count: elements.length,
    elements: elements.slice(0, 12),
  };
}
