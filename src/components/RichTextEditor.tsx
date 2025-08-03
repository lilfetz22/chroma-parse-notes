import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  Image as ImageIcon, 
  Type,
  Palette
} from 'lucide-react';
import { NLHHighlighter } from './NLHHighlighter';
import { useNLHSettings } from '@/hooks/useNLHSettings';

import { Note } from '@/types/note';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  nlhEnabled: boolean;
  onNLHToggle: () => void;
  notes: Note[];
}

export function RichTextEditor({ content, onChange, nlhEnabled, onNLHToggle, notes }: RichTextEditorProps) {
  console.log('📨 RichTextEditor: Received props:', {
    contentLength: content.length,
    nlhEnabled,
    typeof: typeof nlhEnabled,
    onNLHToggle: !!onNLHToggle
  });
  const { user } = useAuth();
  const { settings } = useNLHSettings();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [processedContent, setProcessedContent] = useState(content);
  const [showNoteLinker, setShowNoteLinker] = useState(false);
  const [isProcessingNLH, setIsProcessingNLH] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const nlhTimeoutRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Apply processed content to editor
  useEffect(() => {
    console.log('🔄 RichTextEditor: Should apply processed content?', {
      hasEditorRef: !!editorRef.current,
      processedDifferent: processedContent !== content,
      isProcessingNLH,
      isUserTyping,
      nlhEnabled,
      globalEnabled: settings.globalEnabled
    });

    if (editorRef.current && processedContent !== content && !isProcessingNLH && !isUserTyping && nlhEnabled && settings.globalEnabled) {
      console.log('🎯 RichTextEditor: Applying NLH processed content to editor');
      
      // Store current cursor position with more detailed information
      const selection = window.getSelection();
      let cursorInfo = {
        position: 0,
        node: null as Node | null,
        offset: 0,
        textBeforeCursor: ''
      };
      
      if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        cursorInfo.node = range.startContainer;
        cursorInfo.offset = range.startOffset;
        
        // Calculate text offset position
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorInfo.position = preCaretRange.toString().length;
        
        // Store text before cursor for better restoration
        cursorInfo.textBeforeCursor = preCaretRange.toString();
        
        console.log('📍 Storing cursor position:', cursorInfo.position, 'node:', cursorInfo.node, 'offset:', cursorInfo.offset);
      }
      
      // Apply the processed content
      const beforeHTML = editorRef.current.innerHTML;
      editorRef.current.innerHTML = processedContent;
      
      // DON'T call onChange here - this causes the disappearing letters issue
      // onChange(processedContent); // REMOVED THIS LINE
      
      const afterHTML = editorRef.current.innerHTML;
      
      console.log('🔍 DETAILED CONTENT APPLICATION:');
      console.log('📝 Before innerHTML:', beforeHTML.substring(0, 200));
      console.log('🎨 Setting innerHTML to:', processedContent.substring(0, 200));
      console.log('✅ After innerHTML:', afterHTML.substring(0, 200));
      console.log('🎯 Content actually changed:', beforeHTML !== afterHTML);
      console.log('🎨 Spans preserved:', afterHTML.includes('<span style="color:'));
      
      // Restore cursor position with improved logic
      if (selection && cursorInfo.position > 0) {
        try {
          // Method 1: Try to find the exact text position
          const walker = document.createTreeWalker(
            editorRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let currentPos = 0;
          let node;
          let targetNode = null;
          let targetOffset = 0;
          
          while (node = walker.nextNode()) {
            const nodeLength = node.textContent?.length || 0;
            if (currentPos + nodeLength >= cursorInfo.position) {
              targetNode = node;
              targetOffset = cursorInfo.position - currentPos;
              break;
            }
            currentPos += nodeLength;
          }
          
          if (targetNode) {
            const range = document.createRange();
            const maxOffset = targetNode.textContent?.length || 0;
            const safeOffset = Math.min(targetOffset, maxOffset);
            range.setStart(targetNode, safeOffset);
            range.setEnd(targetNode, safeOffset);
            selection.removeAllRanges();
            selection.addRange(range);
            console.log('✅ Cursor position restored to:', safeOffset);
          } else {
            // Method 2: Fallback - find by text content
            const textNodes = [];
            const walker2 = document.createTreeWalker(
              editorRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            while (node = walker2.nextNode()) {
              textNodes.push(node);
            }
            
            // Find the last text node and place cursor at the end
            if (textNodes.length > 0) {
              const lastNode = textNodes[textNodes.length - 1];
              const range = document.createRange();
              const nodeLength = lastNode.textContent?.length || 0;
              range.setStart(lastNode, nodeLength);
              range.setEnd(lastNode, nodeLength);
              selection.removeAllRanges();
              selection.addRange(range);
              console.log('✅ Cursor position restored to end of last text node');
            }
          }
        } catch (error) {
          console.error('❌ Error restoring cursor:', error);
        }
      }
    } else if (isUserTyping) {
      console.log('⏸️ RichTextEditor: Skipping NLH processing - user is typing');
    }
  }, [processedContent, content, isProcessingNLH, isUserTyping, nlhEnabled, settings.globalEnabled]);

  const handleProcessedContent = useCallback((processed: string) => {
    console.log('📥 RichTextEditor: Received processed content from NLHHighlighter');
    console.log('📊 Content comparison:', {
      originalLength: content.length,
      processedLength: processed.length,
      hasChanges: processed !== content,
      originalPreview: content.substring(0, 150),
      processedPreview: processed.substring(0, 150),
      hasColorSpans: processed.includes('<span style="color:'),
      spanCount: (processed.match(/<span style="color:/g) || []).length
    });
    
    if (processed.includes('<span style="color:')) {
      console.log('🎨 FOUND COLOR SPANS! Sample spans:', 
        processed.match(/<span style="color: [^"]*;">[^<]*<\/span>/g)?.slice(0, 3)
      );
    }
    
    // Clear any existing timeout
    if (nlhTimeoutRef.current) {
      clearTimeout(nlhTimeoutRef.current);
    }
    
    // Wait for user to finish typing (1 second pause) before applying NLH
    nlhTimeoutRef.current = setTimeout(() => {
      console.log('⏰ RichTextEditor: Applying NLH after typing pause');
      setIsProcessingNLH(true);
      setProcessedContent(processed);
      // Small delay to ensure the content is applied before allowing further processing
      setTimeout(() => {
        console.log('⏰ RichTextEditor: NLH processing timeout completed');
        setIsProcessingNLH(false);
      }, 100);
    }, 1000); // 1 second pause for typing
  }, [content]);

  const insertText = (text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateFormatState();
  };

  const updateFormatState = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateFormatState();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleLinkClick = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setShowLinkInput(true);
      // Focus the input after a brief delay to ensure the UI is updated
      setTimeout(() => {
        linkInputRef.current?.focus();
      }, 100);
    } else {
      toast({
        title: "Select text first",
        description: "Please select some text to create a hyperlink.",
      });
    }
  };

  const insertLink = () => {
    if (linkUrl && selectedText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'text-black underline hover:text-black/80';
        link.style.color = 'black';
        link.textContent = selectedText;
        range.deleteContents();
        range.insertNode(link);
        
        // Update the content
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }
      setShowLinkInput(false);
      setLinkUrl('');
      setSelectedText('');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('note-images')
        .getPublicUrl(filePath);

      const imageHtml = `<img src="${data.publicUrl}" alt="Uploaded image" class="max-w-full h-auto rounded-lg my-2" />`;
      handleFormat('insertHTML', imageHtml);

      toast({
        title: "Image uploaded",
        description: "Image has been added to your note.",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
      });
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current && !isProcessingNLH) {
      console.log('✏️ RichTextEditor: User is editing content');
      const currentHTML = editorRef.current.innerHTML;
      console.log('🔍 Current editor HTML:', currentHTML.substring(0, 200));
      console.log('🎨 Still has colored spans:', currentHTML.includes('<span style="color:'));
      
      // Set user as typing
      setIsUserTyping(true);
      
      // Clear existing typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to mark user as finished typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsUserTyping(false);
        console.log('⏸️ RichTextEditor: User finished typing');
      }, 500); // 500ms to mark as finished typing
      
      // Convert checkboxes but preserve other HTML including color spans
      let newContent = currentHTML.replace(/\[ \]/g, '<input type="checkbox" class="mr-2" />');
      newContent = newContent.replace(/\[x\]/g, '<input type="checkbox" checked class="mr-2" />');

      if (newContent.slice(-2) === '[[') {
        setShowNoteLinker(true);
      }
      
      // Clear any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounced save to parent state
      saveTimeoutRef.current = setTimeout(() => {
        console.log('📤 Sending to onChange:', newContent.substring(0, 200));
        onChange(newContent);
      }, 300); // 300ms debounce for saving
    } else if (isProcessingNLH) {
      console.log('⏸️ RichTextEditor: Skipping content change during NLH processing');
    }
  };

  const handleNoteLink = (note: Note) => {
    if (editorRef.current) {
      const link = document.createElement('a');
      link.href = `/note/${note.id}`;
      link.textContent = note.title;
      link.className = 'text-black underline hover:text-black/80';
      link.style.color = 'black';

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(link);
      }

      setShowNoteLinker(false);
    }
  };

  useEffect(() => {
    console.log('🔄 RichTextEditor: Content sync check:', {
      hasEditorRef: !!editorRef.current,
      contentChanged: content !== (editorRef.current?.innerHTML || ''),
      isProcessingNLH,
      contentLength: content.length,
      editorLength: editorRef.current?.innerHTML?.length || 0,
      nlhEnabled,
      globalEnabled: settings.globalEnabled
    });
    
    // Don't sync content if NLH is enabled and processing, or if we're in the middle of NLH processing
    if (editorRef.current && content !== editorRef.current.innerHTML && !isProcessingNLH && !(nlhEnabled && settings.globalEnabled)) {
      // Check if the difference is significant (not just whitespace or minor differences)
      const editorContent = editorRef.current.innerHTML;
      const normalizedContent = content.replace(/\s+/g, ' ').trim();
      const normalizedEditor = editorContent.replace(/\s+/g, ' ').trim();
      
      if (normalizedContent !== normalizedEditor) {
        console.log('📝 RichTextEditor: Syncing content to editor (content prop changed)');
        
        // Store cursor position before updating
        const selection = window.getSelection();
        let cursorPosition = 0;
        
        if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(editorRef.current);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          cursorPosition = preCaretRange.toString().length;
        }
        
        // Update the content
        editorRef.current.innerHTML = content;
        
        // Restore cursor position
        if (selection && cursorPosition > 0) {
          try {
            const walker = document.createTreeWalker(
              editorRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let currentPos = 0;
            let node;
            let targetNode = null;
            let targetOffset = 0;
            
            while (node = walker.nextNode()) {
              const nodeLength = node.textContent?.length || 0;
              if (currentPos + nodeLength >= cursorPosition) {
                targetNode = node;
                targetOffset = cursorPosition - currentPos;
                break;
              }
              currentPos += nodeLength;
            }
            
            if (targetNode) {
              const range = document.createRange();
              const maxOffset = targetNode.textContent?.length || 0;
              const safeOffset = Math.min(targetOffset, maxOffset);
              range.setStart(targetNode, safeOffset);
              range.setEnd(targetNode, safeOffset);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } catch (error) {
            console.error('❌ Error restoring cursor during content sync:', error);
          }
        }
      }
    } else if (nlhEnabled && settings.globalEnabled) {
      console.log('⏸️ RichTextEditor: Skipping content sync - NLH is enabled and processing');
    }
  }, [content, isProcessingNLH, nlhEnabled, settings.globalEnabled]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nlhTimeoutRef.current) {
        clearTimeout(nlhTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Button
          variant={isBold ? 'default' : 'outline'}
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleFormat('bold');
          }}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={isItalic ? 'default' : 'outline'}
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleFormat('italic');
          }}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={isUnderline ? 'default' : 'outline'}
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleFormat('underline');
          }}
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLinkClick}
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant={nlhEnabled ? "default" : "outline"}
          size="sm"
          onClick={onNLHToggle}
        >
          <Palette className="h-4 w-4" />
          {nlhEnabled ? 'NLH On' : 'NLH Off'}
        </Button>
        
        {/* Test button for debugging */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('🧪 TEST: Manual NLH trigger clicked');
            console.log('🧪 TEST: Current content:', content);
            console.log('🧪 TEST: NLH enabled:', nlhEnabled);
            console.log('🧪 TEST: Settings:', settings);
            
            // Manually trigger NLH processing
            if (nlhEnabled && settings.globalEnabled) {
              console.log('🧪 TEST: Triggering manual NLH processing');
              // Force a re-render by updating content
              if (editorRef.current) {
                const currentContent = editorRef.current.innerHTML;
                console.log('🧪 TEST: Current editor content:', currentContent);
                onChange(currentContent);
              }
            } else {
              console.log('🧪 TEST: NLH is disabled, cannot process');
            }
          }}
        >
          Test NLH
        </Button>
      </div>

      {/* Link Input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 p-3 bg-muted">
          <Input
            ref={linkInputRef}
            placeholder="Enter URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && insertLink()}
            onKeyDown={(e) => e.key === 'Escape' && setShowLinkInput(false)}
          />
          <Button size="sm" onClick={insertLink}>Add Link</Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLinkInput(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Note Linker */}
      {showNoteLinker && (
        <div className="absolute z-10 bg-card border rounded-md shadow-lg">
          <div className="p-2">
            <Input placeholder="Search notes..." />
          </div>
          <ScrollArea className="h-40">
            <div className="p-2 space-y-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => handleNoteLink(note)}
                >
                  {note.title}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          className="w-full h-full p-4 outline-none prose prose-sm max-w-none"
          style={{ 
            minHeight: '100%',
            color: 'inherit' // Don't force black color that might override spans
          }}
          onInput={handleContentChange}
          onPaste={handlePaste}
        />
      </div>

      {/* NLH Processor */}
      <NLHHighlighter
        content={content}
        enabled={nlhEnabled}
        settings={settings}
        onProcessedContent={handleProcessedContent}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}