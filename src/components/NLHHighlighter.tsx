// src/components/NLHHighlighter.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import nlp from 'compromise';
import { NLHSettings } from '@/types/note';

interface NLHHighlighterProps {
  content: string;
  enabled: boolean;
  settings: NLHSettings;
  onProcessedContent: (content: string) => void;
  isPasted?: boolean; // Flag to indicate if content was pasted
}

// Configuration for chunked processing
const CHUNK_SIZE_THRESHOLD = 500; // Lines threshold for chunked processing
const CHUNK_SIZE = 100; // Lines per chunk
const CHUNK_DELAY = 10; // Milliseconds between chunks

export function NLHHighlighter({ content, enabled, settings, onProcessedContent, isPasted = false }: NLHHighlighterProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [previousContentLength, setPreviousContentLength] = useState(0);

  // Helper function to count lines in content
  const countLines = useCallback((text: string): number => {
    return text.split('\n').length;
  }, []);

  // Process content in chunks for large pasted text
  const processContentInChunks = useCallback(async (text: string): Promise<string> => {
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
      
      // Use the same processing logic as the main function
      try {
        const spanRegex = /<span style="color: (.*?); font-weight: 500;">(.*?)<\/span>/g;
        const workingContent = chunk.replace(spanRegex, '$2');

        const tags: string[] = [];
        const tagPlaceholder = '___HTML_TAG_PLACEHOLDER___';
        const textToAnalyze = workingContent.replace(/<[^>]+>/g, (match) => {
          tags.push(match);
          return tagPlaceholder;
        });
        
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
          const sentences = doc.json();

          sentences.forEach(sentence => {
              (sentence.terms as any[]).forEach(term => {
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
            processedChunks.push(finalHtml);
          }
        }
      } catch (error) {
        console.error('💥 NLH chunk processing error:', error);
        processedChunks.push(chunk);
      }
      
      // Yield control back to the browser between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
      }
    }
    
    return processedChunks.join('\n');
  }, [settings]);

  // Effect to handle chunked processing for large pasted content
  useEffect(() => {
    const currentContentLength = content.length;
    const isContentDeleted = currentContentLength < previousContentLength;
    
    // Update the previous content length
    setPreviousContentLength(currentContentLength);
    
    if (!enabled || !settings.globalEnabled || !content.trim()) {
      return;
    }

    // Don't process if content is being deleted or reduced in size
    if (isContentDeleted) {
      return;
    }

    const lineCount = content.split('\n').length;
    
    // If content is large and was pasted, process in chunks
    if (isPasted && lineCount > CHUNK_SIZE_THRESHOLD && !isProcessing) {
      setIsProcessing(true);
      setPendingContent(content);
      
      processContentInChunks(content)
        .then((result) => {
          setIsProcessing(false);
          setPendingContent(null);
          onProcessedContent(result);
        })
        .catch((error) => {
          console.error('💥 NLH chunked processing error:', error);
          setIsProcessing(false);
          setPendingContent(null);
          onProcessedContent(content); // Return original on error
        });
    }
  }, [content, enabled, settings.globalEnabled, isPasted, isProcessing, processContentInChunks, onProcessedContent, previousContentLength]);

  const processedContent = useMemo(() => {
    // If we're processing chunks, don't do synchronous processing
    if (isProcessing || pendingContent) {
      return content;
    }
    
    if (!enabled || !settings.globalEnabled || !content.trim()) {
      return content;
    }

    // Check if this is large pasted content that should be chunked
    const lineCount = content.split('\n').length;
    if (isPasted && lineCount > CHUNK_SIZE_THRESHOLD) {
      return content; // Let the effect handle chunked processing
    }

    // For normal content (not large pasted content), process synchronously
    try {
      // 1. Clean previously added NLH spans to prevent nesting issues.
      const spanRegex = /<span style="color: (.*?); font-weight: 500;">(.*?)<\/span>/g;
      const workingContent = content.replace(spanRegex, '$2');

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
  }, [content, enabled, settings, isPasted, isProcessing, pendingContent]);

  useEffect(() => {
    // Only call the update function if the content has actually changed to avoid unnecessary re-renders.
    if (processedContent !== content) {
      onProcessedContent(processedContent);
    }
  }, [processedContent, onProcessedContent, content]);

  return null;
}