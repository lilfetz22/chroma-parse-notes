// src/components/NLHHighlighter.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import nlp from 'compromise';
import { NLHSettings } from '@/types/note';

// Type definitions for compromise.js
interface CompromiseTerm {
  text: string;
  tags: string[];
  pre?: string;
  post?: string;
}

interface CompromiseSentence {
  terms: CompromiseTerm[];
}

interface NLHHighlighterProps {
  content: string;
  enabled: boolean;
  settings: NLHSettings;
  onProcessedContent: (content: string) => void;
  isPasted?: boolean; // Flag to indicate if content was pasted
  isTyping?: boolean; // Flag to indicate if user is actively typing
}

// Configuration for chunked processing
const CHUNK_SIZE_THRESHOLD = 500; // Lines threshold for chunked processing
const CHUNK_SIZE = 100; // Lines per chunk
const CHUNK_DELAY = 10; // Milliseconds between chunks
const NLH_DEBOUNCE_DELAY = 300; // Milliseconds to wait after typing stops before processing

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  if (typeof window === 'undefined') {
    return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// **NEW:** Robust cleanup function using DOMParser
const cleanupHighlights = (html: string): string => {
  if (typeof window === 'undefined' || !html) {
    return html;
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all spans that were added by this highlighter
    // The specific style 'font-weight: 500' is a good signature
    const highlightSpans = doc.body.querySelectorAll('span[style*="font-weight: 500"]');
    
    highlightSpans.forEach(span => {
      // Replace the span with its own content (unwrap it)
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
      }
    });
    
    // Return the cleaned innerHTML of the body
    return doc.body.innerHTML;
  } catch (error) {
    console.error('💥 NLH cleanup error:', error);
    // Fallback to original content on parsing error
    return html;
  }
};


export function NLHHighlighter({ content, enabled, settings, onProcessedContent, isPasted = false, isTyping = false }: NLHHighlighterProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [previousContentLength, setPreviousContentLength] = useState(0);
  const [debouncedContent, setDebouncedContent] = useState(content);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce content changes when user is typing
  useEffect(() => {
    if (isTyping) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set new timer to update debounced content after delay
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedContent(content);
      }, NLH_DEBOUNCE_DELAY);
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    } else {
      // If not typing, update immediately (for paste operations, etc.)
      setDebouncedContent(content);
    }
  }, [content, isTyping]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Helper function to count lines in content
  const countLines = useCallback((text: string): number => {
    return text.split('\n').length;
  }, []);

  // Process content in chunks for large pasted text
  const processContentInChunks = useCallback(async (text: string): Promise<string> => {
    // console.log('[NLH CHUNK] Starting chunk processing.');
    const lines = text.split('\n');
    const chunks: string[] = [];
    
    // Split into chunks
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      chunks.push(lines.slice(i, i + CHUNK_SIZE).join('\n'));
    }
    
    const processedChunks: string[] = [];
    
    // Process each chunk with a delay between them
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // console.log(`[NLH CHUNK] Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        // **FIX:** Use the new robust cleanup function
        const workingContent = cleanupHighlights(chunk);

        const decodedContent = decodeHtmlEntities(workingContent);
        // console.log(`[NLH CHUNK ${i+1}] Decoded content:`, { from: workingContent, to: decodedContent });

        const tags: string[] = [];
        const tagPlaceholder = '___HTML_TAG_PLACEHOLDER___';
        const textToAnalyze = decodedContent.replace(/<[^>]+>/g, (match) => {
          tags.push(match);
          return tagPlaceholder;
        });
        // console.log(`[NLH CHUNK ${i+1}] Text for NLP:`, textToAnalyze);
        
        if (!textToAnalyze.trim()) {
          processedChunks.push(chunk);
        } else {
          const doc = nlp(textToAnalyze);
          const priorityMap: Array<{ key: keyof typeof settings.partOfSpeech, tag: string }> = [
              { key: 'properNoun', tag: 'ProperNoun' },
              { key: 'verb', tag: 'Verb' },
              { key: 'adverb', tag: 'Adverb' },
              { key: 'adjective', tag: 'Adjective' },
              { key: 'number', tag: 'Value' },
              { key: 'noun', tag: 'Noun' },
          ];

          let highlightedText = '';
          const sentences = doc.json() as CompromiseSentence[];

          sentences.forEach(sentence => {
              sentence.terms.forEach(term => {
                  let color = null;
                  
                  if (term.text === tagPlaceholder) {
                      highlightedText += term.text;
                      return;
                  }
                  
                  for (const p of priorityMap) {
                      const setting = settings.partOfSpeech[p.key];
                      if (setting.enabled && term.tags.includes(p.tag)) {
                          color = setting.color;
                          break;
                      }
                  }
                  
                  if (!color && settings.partOfSpeech.number.enabled && /^\d+(\.\d+)?$/.test(term.text)) {
                      color = settings.partOfSpeech.number.color;
                  }

                  const termHtml = color
                      ? `<span style="color: ${color}; font-weight: 500;">${term.text}</span>`
                      : term.text;

                  highlightedText += (term.pre || '') + termHtml + (term.post || '');
              });
          });

          if (!highlightedText.trim()) {
              processedChunks.push(chunk);
          } else {
            let finalHtml = highlightedText;
            tags.forEach(tag => {
              finalHtml = finalHtml.replace(tagPlaceholder, tag);
            });
            // console.log(`[NLH CHUNK ${i+1}] Final generated HTML:`, finalHtml);
            processedChunks.push(finalHtml);
          }
        }
      } catch (error) {
        console.error('💥 NLH chunk processing error:', error);
        processedChunks.push(chunk);
      }
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
      }
    }
    
    return processedChunks.join('\n');
  }, [settings]);

  // Effect to handle chunked processing for large pasted content
  useEffect(() => {
    const currentContentLength = debouncedContent.length;
    const isContentDeleted = currentContentLength < previousContentLength;
    
    setPreviousContentLength(currentContentLength);
    
    if (!enabled || !settings.globalEnabled || !debouncedContent.trim()) {
      return;
    }

    if (isContentDeleted) {
      return;
    }

    const lineCount = debouncedContent.split('\n').length;
    
    if (isPasted && lineCount > CHUNK_SIZE_THRESHOLD && !isProcessing) {
      setIsProcessing(true);
      setPendingContent(debouncedContent);
      
      processContentInChunks(debouncedContent)
        .then((result) => {
          setIsProcessing(false);
          setPendingContent(null);
          onProcessedContent(result);
        })
        .catch((error) => {
          console.error('💥 NLH chunked processing error:', error);
          setIsProcessing(false);
          setPendingContent(null);
          onProcessedContent(debouncedContent);
        });
    }
  }, [debouncedContent, enabled, settings.globalEnabled, isPasted, isProcessing, processContentInChunks, onProcessedContent, previousContentLength]);

  const processedContent = useMemo(() => {
    // console.log('[NLH SYNC] Processing content...');
    if (isProcessing || pendingContent || isTyping) {
      // console.log('[NLH SYNC] Skipping: Chunk processing is active or user is typing.');
      return debouncedContent;
    }
    
    if (!enabled || !settings.globalEnabled || !debouncedContent.trim()) {
      // console.log('[NLH SYNC] Skipping: Not enabled or content is empty.');
      return debouncedContent;
    }

    const lineCount = debouncedContent.split('\n').length;
    if (isPasted && lineCount > CHUNK_SIZE_THRESHOLD) {
      // console.log('[NLH SYNC] Skipping: Large pasted content, deferring to chunk processor.');
      return debouncedContent;
    }
    
    // console.log('[NLH SYNC] Received content:', JSON.stringify(debouncedContent));

    try {
      // **FIX:** Use the new robust cleanup function instead of the fragile regex.
      const workingContent = cleanupHighlights(debouncedContent);
      // console.log('[NLH SYNC] Content after cleanup:', JSON.stringify(workingContent));

      const decodedContent = decodeHtmlEntities(workingContent);
      // console.log('[NLH SYNC] Decoded content for analysis:', { from: workingContent, to: decodedContent });

      const tags: string[] = [];
      const tagPlaceholder = '___HTML_TAG_PLACEHOLDER___';
      const textToAnalyze = decodedContent.replace(/<[^>]+>/g, (match) => {
        tags.push(match);
        return tagPlaceholder;
      });
      // console.log('[NLH SYNC] Text for NLP:', JSON.stringify(textToAnalyze));
      
      if (!textToAnalyze.trim()) {
        return debouncedContent;
      }

      const doc = nlp(textToAnalyze);

      const priorityMap: Array<{ key: keyof typeof settings.partOfSpeech, tag: string }> = [
          { key: 'properNoun', tag: 'ProperNoun' },
          { key: 'verb', tag: 'Verb' },
          { key: 'adverb', tag: 'Adverb' },
          { key: 'adjective', tag: 'Adjective' },
          { key: 'number', tag: 'Value' },
          { key: 'noun', tag: 'Noun' },
      ];

      let highlightedText = '';
      const sentences = doc.json() as CompromiseSentence[];

      sentences.forEach(sentence => {
          sentence.terms.forEach(term => {
              let color = null;
              
              if (term.text === tagPlaceholder) {
                  highlightedText += term.text;
                  return;
              }
              
              for (const p of priorityMap) {
                  const setting = settings.partOfSpeech[p.key];
                  if (setting.enabled && term.tags.includes(p.tag)) {
                      color = setting.color;
                      break;
                  }
              }
              
              if (!color && settings.partOfSpeech.number.enabled && /^\d+(\.\d+)?$/.test(term.text)) {
                  color = settings.partOfSpeech.number.color;
              }

              const termHtml = color
                  ? `<span style="color: ${color}; font-weight: 500;">${term.text}</span>`
                  : term.text;

              highlightedText += (term.pre || '') + termHtml + (term.post || '');
          });
      });

      if (!highlightedText.trim()) {
          return debouncedContent;
      }

      let finalHtml = highlightedText;
      tags.forEach(tag => {
        finalHtml = finalHtml.replace(tagPlaceholder, tag);
      });
      
      // console.log('[NLH SYNC] Final generated HTML:', JSON.stringify(finalHtml));
      return finalHtml;

    } catch (error) {
      console.error('💥 NLH processing error:', error);
      return debouncedContent;
    }
  }, [debouncedContent, enabled, settings, isPasted, isProcessing, pendingContent, isTyping]);

  useEffect(() => {
    if (processedContent !== debouncedContent) {
      // console.log('[NLH] Processed content is different. Calling onProcessedContent.');
      onProcessedContent(processedContent);
    }
  }, [processedContent, onProcessedContent, debouncedContent]);

  return null;
}