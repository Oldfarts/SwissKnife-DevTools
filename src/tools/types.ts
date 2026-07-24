export type Language = 'fi' | 'en';

export interface LocalizedString {
  fi: string;
  en: string;
}

export interface InputField {
  key: string;
  label: LocalizedString;
  type: 'text' | 'textarea' | 'color' | 'select';
  placeholder?: LocalizedString;
  default?: any;
  options?: string[];
}

export interface HistoryItem {
  id: string;
  toolId: string;
  toolName: { fi: string; en: string };
  timestamp: string;
  inputs: Record<string, any>;
  result: any;
}

export interface SwissTool {
  id: string;
  name: LocalizedString;
  category: LocalizedString;
  description: LocalizedString;
  type: 'local' | 'rest-api';
  endpoint?: string;
  inputs: InputField[];
  execute?: (inputs: Record<string, any>, lang: Language) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export function getText(textObj: { fi: string; en: string } | string | undefined, lang: Language): string {
  if (!textObj) return ''; // Jos arvo on puuttumallaan, palautetaan tyhjä merkkijono
  if (typeof textObj === 'string') return textObj; // Jos se onkin suora merkkijono
  return textObj[lang] || textObj.fi || '';
}

// types.ts
export interface WorkflowStep {
  toolId: string;
  customInputs?: Record<string, any>;
}