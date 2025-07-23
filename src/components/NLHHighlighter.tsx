import { useEffect, useMemo } from 'react';
import nlp from 'compromise';
import { NLHSettings } from '@/types/note';

interface NLHHighlighterProps {
  content: string;
  enabled: boolean;
  settings: NLHSettings;
  onProcessedContent: (content: string) => void;
}

export function NLHHighlighter({ content, enabled, settings, onProcessedContent }: NLHHighlighterProps) {
  const processedContent = useMemo(() => {
    if (!enabled || !settings.globalEnabled || !content.trim()) {
      return content;
    }

    try {
      const doc = nlp(content);
      let processedText = content;

      // Process different parts of speech
      const posMap = {
        noun: { method: 'nouns', setting: settings.partOfSpeech.noun },
        verb: { method: 'verbs', setting: settings.partOfSpeech.verb },
        adjective: { method: 'adjectives', setting: settings.partOfSpeech.adjective },
        adverb: { method: 'adverbs', setting: settings.partOfSpeech.adverb },
      };

      // Process each part of speech
      Object.entries(posMap).forEach(([posType, { method, setting }]) => {
        if (setting.enabled) {
          const terms = (doc as any)[method]();
          terms.forEach((term: any) => {
            const text = term.text();
            const regex = new RegExp(`\\b${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            processedText = processedText.replace(regex, 
              `<span style="color: ${setting.color};">${text}</span>`
            );
          });
        }
      });

      // Handle numbers separately
      if (settings.partOfSpeech.number.enabled) {
        const numberRegex = /\b\d+(?:\.\d+)?\b/g;
        processedText = processedText.replace(numberRegex, 
          `<span style="color: ${settings.partOfSpeech.number.color};">processedText = processedText.replace(numberRegex, 
          `<span style="background-color: ${settings.partOfSpeech.number.color}; color: white; padding: 1px 3px; border-radius: 3px; font-weight: 500;">$&</span>`
        );</span>`
        );
      }

      // Handle proper nouns (capitalized words)
      if (settings.partOfSpeech.properNoun.enabled) {
        const properNounRegex = /\b[A-Z][a-zA-Z]*\b/g;
        processedText = processedText.replace(properNounRegex, (match) => {
          if (processedText.includes(`<span style="color:`)) {
            return match;
          }
          return `<span style="color: ${settings.partOfSpeech.properNoun.color};">${match}</span>`;
        });
      }

      return processedText;
    } catch (error) {
      console.error('NLH processing error:', error);
      return content;
    }
  }, [content, enabled, settings]);

  useEffect(() => {
    onProcessedContent(processedContent);
  }, [processedContent, onProcessedContent]);

  return null;
}