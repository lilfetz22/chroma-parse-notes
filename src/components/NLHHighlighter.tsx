// src/components/NLHHighlighter.tsx
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
        // 1. Clean the content: Remove all previous NLH spans to prevent nesting and break the re-processing loop.
        // This regex specifically targets the spans created by this component.
        const spanRegex = /<span style="color: (.*?); font-weight: 500;">(.*?)<\/span>/g;
        const cleanedContent = content.replace(spanRegex, '$2'); // $2 keeps the inner text

        // 2. Get clean text for analysis from the now-cleaned HTML.
        // This safely strips all HTML tags and decodes entities like `&amp;` to `&`.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedContent;
        const textToAnalyze = tempDiv.textContent || '';
        
        if (!textToAnalyze) return cleanedContent; // Nothing to analyze

        const doc = nlp(textToAnalyze);

        // 3. Create a map of all unique words and their assigned color for efficient processing.
        const colorMap = new Map<string, string>();
        const posConfig = [
          { setting: settings.partOfSpeech.properNoun, terms: doc.match('#ProperNoun').out('array') },
          { setting: settings.partOfSpeech.verb, terms: doc.verbs().out('array') },
          { setting: settings.partOfSpeech.adverb, terms: doc.adverbs().out('array') },
          { setting: settings.partOfSpeech.adjective, terms: doc.adjectives().out('array') },
          { setting: settings.partOfSpeech.noun, terms: doc.nouns().out('array') },
          { setting: settings.partOfSpeech.number, terms: textToAnalyze.match(/\b\d+(\.\d+)?\b/g) || [] }
        ];

        posConfig.forEach(({ setting, terms }) => {
          if (setting.enabled && terms) {
            terms.forEach(term => {
              if (!colorMap.has(term)) {
                colorMap.set(term, setting.color);
              }
            });
          }
        });
        
        if (colorMap.size === 0) {
          return cleanedContent; // Return the cleaned content if no words to highlight
        }

        // 4. Build a single, performant Regex from all the words to be colored.
        const allTerms = Array.from(colorMap.keys());
        const escapedTerms = allTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Sort by length to match longer phrases first (e.g., "New York" before "New").
        escapedTerms.sort((a, b) => b.length - a.length);
        if (escapedTerms.length === 0) return cleanedContent;
        const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'g');

        // 5. Replace words in the CLEANED content string. This is now safe because the regex
        // is built from plain text and won't match/corrupt HTML attributes.
        const processedText = cleanedContent.replace(regex, (match) => {
          const color = colorMap.get(match);
          return `<span style="color: ${color}; font-weight: 500;">${match}</span>`;
        });
        
        return processedText;

      } catch (error) {
        console.error('💥 NLH processing error:', error);
        return content; // Return original content on error
      }
  }, [content, enabled, settings]);

  useEffect(() => {
    onProcessedContent(processedContent); 
  }, [processedContent, onProcessedContent]);

  return null;
}