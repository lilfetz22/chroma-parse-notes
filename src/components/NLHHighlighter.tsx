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

      // Process different parts of speech in order of specificity
      const posMap = [
        { type: 'properNoun', method: 'match', setting: settings.partOfSpeech.properNoun },
        { type: 'noun', method: 'nouns', setting: settings.partOfSpeech.noun },
        { type: 'verb', method: 'verbs', setting: settings.partOfSpeech.verb },
        { type: 'adjective', method: 'adjectives', setting: settings.partOfSpeech.adjective },
        { type: 'adverb', method: 'adverbs', setting: settings.partOfSpeech.adverb },
      ];

      // Process each part of speech
      posMap.forEach(({ type, method, setting }) => {
        if (setting.enabled) {
          let terms: any[] = [];
          
          if (type === 'properNoun') {
            // Handle proper nouns (capitalized words) with compromise
            const properNouns = doc.match('#ProperNoun');
            terms = properNouns.out('array');
          } else {
            terms = (doc as any)[method]().out('array');
          }
          
          terms.forEach((term: any) => {
            const text = typeof term === 'string' ? term : term.text();
            if (text && text.trim()) {
              // Escape regex special characters
              const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escapedText}\\b`, 'gi');
              
              // Only replace if the text hasn't been processed yet
              processedText = processedText.replace(regex, (match) => {
                // Check if this match is already inside a span
                const beforeMatch = processedText.substring(0, processedText.indexOf(match));
                const afterMatch = processedText.substring(processedText.indexOf(match) + match.length);
                
                // Simple check to avoid double-processing
                if (beforeMatch.includes('<span style="color:') && afterMatch.includes('</span>')) {
                  return match;
                }
                
                return `<span style="color: ${setting.color};">${match}</span>`;
              });
            }
          });
        }
      });

      // Handle numbers separately
      if (settings.partOfSpeech.number.enabled) {
        const numberRegex = /\b\d+(?:\.\d+)?\b/g;
        processedText = processedText.replace(numberRegex, (match) => {
          // Check if this number is already inside a span
          const beforeMatch = processedText.substring(0, processedText.indexOf(match));
          const afterMatch = processedText.substring(processedText.indexOf(match) + match.length);
          
          if (beforeMatch.includes('<span style="color:') && afterMatch.includes('</span>')) {
            return match;
          }
          
          return `<span style="color: ${settings.partOfSpeech.number.color};">${match}</span>`;
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