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
      // 1. Clean previously added NLH spans to prevent nesting issues.
      const spanRegex = /<span style="color: (.*?); font-weight: 500;">(.*?)<\/span>/g;
      let workingContent = content.replace(spanRegex, '$2');

      // 2. Protect HTML tags by replacing them with a placeholder.
      const tags: string[] = [];
      const tagPlaceholder = '___HTML_TAG_PLACEHOLDER___';
      workingContent = workingContent.replace(/<[^>]+>/g, (match) => {
        tags.push(match);
        return tagPlaceholder;
      });
      
      // 3. Decode any HTML entities in the remaining text to get a clean string for analysis.
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = workingContent;
      const textToAnalyze = tempDiv.textContent || '';

      if (!textToAnalyze.trim()) {
        return content; // Nothing to highlight, return original content to avoid changes.
      }

      const doc = nlp(textToAnalyze);

      // 4. Create a map of all unique words to highlight and their assigned color, using a context-aware approach.
      const colorMap = new Map<string, string>();

      // Define priority for tags. Lower index = higher priority.
      const tagPriority: { tag: keyof typeof settings.partOfSpeech, compromiseTag: string }[] = [
          { tag: 'properNoun', compromiseTag: '#ProperNoun' },
          { tag: 'verb',       compromiseTag: '#Verb' },
          { tag: 'adverb',     compromiseTag: '#Adverb' },
          { tag: 'adjective',  compromiseTag: '#Adjective' },
          { tag: 'number',     compromiseTag: '#Value' },
          { tag: 'noun',       compromiseTag: '#Noun' },
      ];

      // Process each term from the parsed document, respecting context
      doc.terms().forEach(term => {
          const text = term.text();
          if (!text.trim() || colorMap.has(text)) {
              return; // Skip empty or already-colored terms
          }

          // Find the highest-priority tag for this term
          for (const { tag, compromiseTag } of tagPriority) {
              const setting = settings.partOfSpeech[tag];
              if (setting.enabled && term.has(compromiseTag)) {
                  colorMap.set(text, setting.color);
                  break; // Found the highest priority tag, move to next term
              }
          }
      });

      // Fallback for numbers that compromise might miss.
      if (settings.partOfSpeech.number.enabled) {
          const numbers = textToAnalyze.match(/\b\d+(\.\d+)?\b/g) || [];
          numbers.forEach(num => {
              if (!colorMap.has(num)) {
                  colorMap.set(num, settings.partOfSpeech.number.color);
              }
          });
      }
      
      if (colorMap.size === 0) {
        return content; // No highlights to apply, return original.
      }

      // 5. Build a single, efficient regex from all words to highlight.
      const allTerms = Array.from(colorMap.keys());
      const escapedTerms = allTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      escapedTerms.sort((a, b) => b.length - a.length);
      const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'g');

      // 6. Apply highlighting ONLY to the text content (which has placeholders instead of tags).
      let highlightedText = workingContent.replace(regex, (match) => {
        const color = colorMap.get(match);
        return `<span style="color: ${color}; font-weight: 500;">${match}</span>`;
      });

      // 7. Restore the original HTML tags from the placeholders.
      tags.forEach(tag => {
        highlightedText = highlightedText.replace(tagPlaceholder, tag);
      });

      return highlightedText;

    } catch (error) {
      console.error('💥 NLH processing error:', error);
      return content; // On error, return original content to prevent data loss.
    }
  }, [content, enabled, settings]);

  useEffect(() => {
    // Only call the update function if the content has actually changed to avoid unnecessary re-renders.
    if (processedContent !== content) {
      onProcessedContent(processedContent);
    }
  }, [processedContent, onProcessedContent, content]);

  return null;
}