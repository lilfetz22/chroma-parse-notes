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
      // 1. Clean previously added NLH spans to prevent nesting issues.
      const spanRegex = /<span style="color: (.*?); font-weight: 500;">(.*?)<\/span>/g;
      let workingContent = content.replace(spanRegex, '$2');

      // 2. Protect HTML tags by replacing them with a placeholder.
      const tags: string[] = [];
      const tagPlaceholder = '___HTML_TAG_PLACEHOLDER___';
      const textToAnalyze = workingContent.replace(/<[^>]+>/g, (match) => {
        tags.push(match);
        return tagPlaceholder;
      });
      
      if (!textToAnalyze.trim()) {
        return content; // Nothing to highlight, return original content to avoid changes.
      }

      const doc = nlp(textToAnalyze);

      // 4. Build the highlighted HTML string by iterating through parsed terms one by one, preserving context.
      const priorityMap: Array<{ key: keyof typeof settings.partOfSpeech, tag: string }> = [
          { key: 'properNoun', tag: 'ProperNoun' },
          { key: 'verb', tag: 'Verb' },
          { key: 'adverb', tag: 'Adverb' },
          { key: 'adjective', tag: 'Adjective' },
          { key: 'number', tag: 'Value' }, // Compromise uses 'Value' for numbers
          { key: 'noun', tag: 'Noun' },
      ];

      let highlightedText = '';
      const sentences = doc.json();

      sentences.forEach(sentence => {
          (sentence.terms as any[]).forEach(term => {
              let color = null;
              
              // Don't highlight the placeholder itself
              if (term.text === tagPlaceholder) {
                  highlightedText += term.text;
                  return;
              }
              
              // Find the highest-priority tag for this specific term
              for (const p of priorityMap) {
                  const setting = settings.partOfSpeech[p.key];
                  if (setting.enabled && term.tags.includes(p.tag)) {
                      color = setting.color;
                      break; // Found highest priority match for this term
                  }
              }
              
              // Fallback check for numbers if compromise misses the #Value tag
              if (!color && settings.partOfSpeech.number.enabled && /^\d+(\.\d+)?$/.test(term.text)) {
                  color = settings.partOfSpeech.number.color;
              }

              // Construct the term with its original punctuation and optional highlighting
              const termHtml = color
                  ? `<span style="color: ${color}; font-weight: 500;">${term.text}</span>`
                  : term.text;

              highlightedText += (term.pre || '') + termHtml + (term.post || '');
          });
      });

      if (!highlightedText.trim()) {
          return content; // If processing results in empty, return original
      }

      // 7. Restore the original HTML tags from the placeholders.
      let finalHtml = highlightedText;
      tags.forEach(tag => {
        finalHtml = finalHtml.replace(tagPlaceholder, tag);
      });

      return finalHtml;

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