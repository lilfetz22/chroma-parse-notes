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
      // This is the key step to prevent the highlighter from corrupting attributes like `href`.
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

      // 4. Create a map of all unique words to highlight and their assigned color.
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
            if (term && !colorMap.has(term)) {
              colorMap.set(term, setting.color);
            }
          });
        }
      });
      
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