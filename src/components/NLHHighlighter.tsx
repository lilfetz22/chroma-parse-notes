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
  console.log('🔍 NLHHighlighter render:', { 
    enabled, 
    globalEnabled: settings.globalEnabled, 
    contentLength: content.length,
    contentPreview: content.substring(0, 100)
  });

  // Test compromise.js functionality
  useEffect(() => {
    if (content.trim()) {
      try {
        console.log('🧪 TEST: Testing compromise.js with content:', content.substring(0, 50));
        const testDoc = nlp('The quick brown fox jumps over the lazy dog.');
        const testNouns = testDoc.nouns().out('array');
        const testVerbs = testDoc.verbs().out('array');
        console.log('🧪 TEST: Compromise.js test results:', {
          testNouns,
          testVerbs,
          compromiseWorking: testNouns.length > 0 && testVerbs.length > 0
        });
      } catch (error) {
        console.error('🧪 TEST: Compromise.js test failed:', error);
      }
    }
  }, [content]);

// In NLHHighlighter.tsx

const processedContent = useMemo(() => {
    if (!enabled || !settings.globalEnabled || !content.trim()) {
      return content;
    }

    try {
      // 1. Get clean text for analysis from the HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const textToAnalyze = tempDiv.textContent || '';
      const doc = nlp(textToAnalyze);

      // 2. Create a map of all unique words and their assigned color
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
        if (setting.enabled) {
          terms.forEach(term => {
            if (!colorMap.has(term)) {
              colorMap.set(term, setting.color);
            }
          });
        }
      });
      
      if (colorMap.size === 0) {
        return content; // No words to highlight
      }

      // 3. Build a single Regex from all the words to be colored
      const allTerms = Array.from(colorMap.keys());
      const escapedTerms = allTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      escapedTerms.sort((a, b) => b.length - a.length); // Match longer phrases first
      const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'g');

      // 4. Replace words in the original content, applying the correct font color style
      // This is a simplified approach, but should be much more robust.
      // A more advanced solution would traverse the DOM tree.
      let processedText = content.replace(regex, (match) => {
        // Avoid replacing text within an existing HTML tag
        if (match.includes('<') || match.includes('>')) return match;
        
        const color = colorMap.get(match);
        // **This is the corrected style for font color**
        return `<span style="color: ${color}; font-weight: 500;">${match}</span>`;
      });
      
      return processedText;

    } catch (error) {
      console.error('💥 NLH processing error:', error);
      return content;
    }
}, [content, enabled, settings]);

  useEffect(() => {
    console.log('📤 Sending processed content to parent:', {
      contentLength: processedContent.length,
      hasChanges: processedContent !== content,
      processedPreview: processedContent.substring(0, 100)
    });
    onProcessedContent(processedContent);
  }, [processedContent, onProcessedContent]);

  return null;
}