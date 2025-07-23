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
  console.log('⚙️ useNLHSettings: Hook initialized with default settings:', defaultSettings);
  
  const [settings, setSettings] = useState<NLHSettings>(defaultSettings);

  useEffect(() => {
    console.log('💾 useNLHSettings: Loading settings from localStorage');
    const saved = localStorage.getItem('nlh-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        console.log('✅ useNLHSettings: Successfully loaded settings from localStorage:', parsedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('❌ useNLHSettings: Failed to parse NLH settings:', error);
      }
    } else {
      console.log('📝 useNLHSettings: No saved settings found, using defaults');
    }
  }, []);

  const updateSettings = (newSettings: Partial<NLHSettings>) => {
    console.log('🔄 useNLHSettings: Updating settings:', newSettings);
    const updated = { ...settings, ...newSettings };
    console.log('📊 useNLHSettings: New settings state:', updated);
    setSettings(updated);
    localStorage.setItem('nlh-settings', JSON.stringify(updated));
    console.log('💾 useNLHSettings: Settings saved to localStorage');
  };

  const updatePartOfSpeech = (pos: keyof typeof settings.partOfSpeech, updates: Partial<typeof settings.partOfSpeech[typeof pos]>) => {
    console.log(`🎨 useNLHSettings: Updating ${String(pos)} settings:`, updates);
    const updated = {
      ...settings,
      partOfSpeech: {
        ...settings.partOfSpeech,
        [pos]: { ...settings.partOfSpeech[pos], ...updates }
      }
    };
    console.log('📊 useNLHSettings: New part of speech settings:', updated.partOfSpeech);
    setSettings(updated);
    localStorage.setItem('nlh-settings', JSON.stringify(updated));
    console.log('💾 useNLHSettings: Part of speech settings saved to localStorage');
  };

  console.log('📤 useNLHSettings: Returning current settings:', settings);

  return {
    settings,
    updateSettings,
    updatePartOfSpeech,
  };
}