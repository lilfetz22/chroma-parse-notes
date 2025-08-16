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

// Gets the character offset of the cursor within a container
function getCursorPosition(parent: Node) {
  const selection = window.getSelection();
  let charCount = -1;
  if (selection?.focusNode) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(parent);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    charCount = preCaretRange.toString().length;
  }
  return charCount;
}

// Sets the cursor position in a container at a specific character offset
function setCursorPosition(parent: Node, position: number) {
  const selection = window.getSelection();
  const range = document.createRange();
  let charCount = 0;
  
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode()) && charCount < position) {
    const nodeLength = node.textContent!.length;
    if (charCount + nodeLength >= position) {
      range.setStart(node, position - charCount);
      charCount = position;
      break;
    }
    charCount += nodeLength;
  }

  if (charCount === 0) {
      range.setStart(parent, 0);
  }

  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

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
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // --- START OF INTEGRATED CHANGES ---

  // 1. Ref to store cursor position across re-renders
  const cursorPositionRef = useRef<number | null>(null);

  // 2. Effect to apply highlighted content and restore cursor
  useEffect(() => {
    if (editorRef.current && processedContent !== content && !isProcessingNLH && nlhEnabled && settings.globalEnabled) {
      console.log('🎯 RichTextEditor: Applying NLH processed content to editor');
      
      // Apply the new highlighted content
      editorRef.current.innerHTML = processedContent;
      
      // Update the parent component's state
      onChange(processedContent);
      
      // Restore the cursor position to where it was before the update
      if (cursorPositionRef.current !== null) {
        console.log('✅ Restoring cursor to position:', cursorPositionRef.current);
        setCursorPosition(editorRef.current, cursorPositionRef.current);
      }
    }
  }, [processedContent, content, isProcessingNLH, nlhEnabled, settings.globalEnabled, onChange]);

  const handleProcessedContent = useCallback((processed: string) => {
    console.log('📥 RichTextEditor: Received processed content from NLHHighlighter');
    setIsProcessingNLH(true);
    setProcessedContent(processed);
    // Small delay to ensure the content is applied before allowing further processing
    setTimeout(() => {
      console.log('⏰ RichTextEditor: NLH processing timeout completed');
      setIsProcessingNLH(false);
    }, 50);
  }, []);

  // 3. Handler that saves cursor position BEFORE triggering content update
  const handleContentChange = () => {
    if (editorRef.current && !isProcessingNLH) {
      // Save cursor position BEFORE updating the state
      cursorPositionRef.current = getCursorPosition(editorRef.current);
      console.log('📍 Saving cursor position:', cursorPositionRef.current);

      const currentHTML = editorRef.current.innerHTML;
      
      // Preserve original logic for checkboxes and note linking
      let newContent = currentHTML.replace(/\[ \]/g, '<input type="checkbox" class="mr-2" />');
      newContent = newContent.replace(/\[x\]/g, '<input type="checkbox" checked class="mr-2" />');

      if (newContent.slice(-2) === '[[') {
        setShowNoteLinker(true);
      }
      
      // Update parent state, which triggers the highlighting process
      onChange(newContent);
    }
  };

  // 4. Effect to sync external content changes (e.g., switching notes) without losing cursor position
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML && !isProcessingNLH) {
      console.log('📝 RichTextEditor: Syncing external content to editor');
      
      // Save cursor before changing content
      const position = getCursorPosition(editorRef.current);
      
      editorRef.current.innerHTML = content;
      
      // Restore cursor after changing content
      if (position > -1) {
        setCursorPosition(editorRef.current, position);
      }
    }
  }, [content, isProcessingNLH]);

  // --- END OF INTEGRATED CHANGES ---

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