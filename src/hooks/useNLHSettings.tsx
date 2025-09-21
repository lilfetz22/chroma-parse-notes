// src/hooks/useNLHSettings.tsx
import { useState, useEffect } from 'react';
import { NLHSettings } from '@/types/note';

const defaultSettings: NLHSettings = {
  globalEnabled: true,
  partOfSpeech: {
    noun: { enabled: true, color: '#22c55e' },
    verb: { enabled: true, color: '#eab308' },
    adverb: { enabled: true, color: '#f97316' },
    adjective: { enabled: true, color: '#3b82f6' },
    number: { enabled: true, color: '#ef4444' },
    properNoun: { enabled: true, color: '#8b5cf6' },
  },
};

export function useNLHSettings() {
  const [settings, setSettings] = useState<NLHSettings>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem('nlh-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse NLH settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<NLHSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('nlh-settings', JSON.stringify(updated));
  };

  const updatePartOfSpeech = (pos: keyof typeof settings.partOfSpeech, updates: Partial<typeof settings.partOfSpeech[typeof pos]>) => {
    const updated = {
      ...settings,
      partOfSpeech: {
        ...settings.partOfSpeech,
        [pos]: { ...settings.partOfSpeech[pos], ...updates }
      }
    };
    setSettings(updated);
    localStorage.setItem('nlh-settings', JSON.stringify(updated));
  };

  return {
    settings,
    updateSettings,
    updatePartOfSpeech,
  };
}