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

  const processedContent = useMemo(() => {
    console.log('🔄 NLH Processing started:', { 
      enabled, 
      globalEnabled: settings.globalEnabled, 
      contentTrimmed: content.trim().length > 0 
    });

    if (!enabled || !settings.globalEnabled || !content.trim()) {
      console.log('❌ NLH Processing skipped:', { 
        reason: !enabled ? 'disabled' : !settings.globalEnabled ? 'global disabled' : 'no content' 
      });
      return content;
    }

    try {
      console.log('📝 Raw content analysis:', {
        isHTML: content.includes('<'),
        hasDiv: content.includes('<div'),
        hasSpan: content.includes('<span'),
        contentStart: content.substring(0, 200)
      });

      // Extract plain text from HTML if needed
      let textToAnalyze = content;
      if (content.includes('<')) {
        console.log('🧹 Content appears to be HTML, extracting text...');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        textToAnalyze = tempDiv.textContent || tempDiv.innerText || content;
        console.log('📝 Extracted text for analysis:', textToAnalyze.substring(0, 200));
      }

      console.log('📝 Creating NLP document from extracted text');
      const doc = nlp(textToAnalyze);
      let processedText = content;

      console.log('🎨 Processing parts of speech with settings:', settings.partOfSpeech);

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
        console.log(`🔤 Processing ${type}:`, { enabled: setting.enabled, color: setting.color });
        
        if (setting.enabled) {
          let terms: any[] = [];
          
          if (type === 'properNoun') {
            // Handle proper nouns (capitalized words) with compromise
            console.log('🏛️ Finding proper nouns...');
            const properNouns = doc.match('#ProperNoun');
            terms = properNouns.out('array');
            console.log('🏛️ Found proper nouns:', terms);
          } else {
            console.log(`📚 Finding ${type}s using method: ${method}`);
            terms = (doc as any)[method]().out('array');
            console.log(`📚 Found ${type}s:`, terms);
          }
          
          terms.forEach((term: any) => {
            const text = typeof term === 'string' ? term : term.text();
            console.log(`🎯 Processing term "${text}" for ${type}`);
            
            if (text && text.trim()) {
              // Escape regex special characters
              const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escapedText}\\b`, 'gi');
              
              console.log(`🔍 Looking for "${text}" with regex: ${regex}`);
              
              // Only replace if the text hasn't been processed yet
              const beforeReplacement = processedText;
              processedText = processedText.replace(regex, (match) => {
                console.log(`✅ Found match "${match}" for ${type}, applying color ${setting.color}`);
                
                // Check if this match is already inside a span (avoid double-processing)
                const indexOfMatch = processedText.indexOf(match);
                if (indexOfMatch === -1) {
                  console.log(`⚠️ Skipping "${match}" - not found in current text`);
                  return match;
                }
                
                const beforeMatch = processedText.substring(0, indexOfMatch);
                const afterMatch = processedText.substring(indexOfMatch + match.length);
                
                // Simple check to avoid double-processing
                if (beforeMatch.lastIndexOf('<span style="color:') > beforeMatch.lastIndexOf('</span>')) {
                  console.log(`⚠️ Skipping "${match}" - already inside a span`);
                  return match;
                }
                
                const replacement = `<span style="color: ${setting.color};">${match}</span>`;
                console.log(`🎨 Replacing "${match}" with:`, replacement);
                return replacement;
              });
              
              if (beforeReplacement !== processedText) {
                console.log(`✅ Successfully processed "${text}" for ${type}`);
              } else {
                console.log(`❌ No matches found for "${text}" in content`);
              }
            }
          });
        }
      });

      // Handle numbers separately
      if (settings.partOfSpeech.number.enabled) {
        console.log('🔢 Processing numbers with color:', settings.partOfSpeech.number.color);
        const numberRegex = /\b\d+(?:\.\d+)?\b/g;
        const beforeNumberReplacement = processedText;
        
        processedText = processedText.replace(numberRegex, (match) => {
          console.log(`🔢 Found number "${match}"`);
          
          // Check if this number is already inside a span
          const beforeMatch = processedText.substring(0, processedText.indexOf(match));
          const afterMatch = processedText.substring(processedText.indexOf(match) + match.length);
          
          if (beforeMatch.includes('<span style="color:') && afterMatch.includes('</span>')) {
            console.log(`⚠️ Skipping number "${match}" - already processed`);
            return match;
          }
          
          const replacement = `<span style="color: ${settings.partOfSpeech.number.color};">${match}</span>`;
          console.log(`🎨 Replacing number "${match}" with:`, replacement);
          return replacement;
        });
        
        if (beforeNumberReplacement !== processedText) {
          console.log('✅ Successfully processed numbers');
        }
      }

      console.log('🎉 NLH Processing completed');
      console.log('📊 Content comparison:', {
        originalLength: content.length,
        processedLength: processedText.length,
        hasChanges: content !== processedText,
        processedPreview: processedText.substring(0, 200)
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