// src/components/RichTextEditor.tsx
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

// Configuration for chunked processing (should match NLHHighlighter)
const CHUNK_SIZE_THRESHOLD = 500; // Lines threshold for chunked processing

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
  const { user } = useAuth();
  const { settings } = useNLHSettings();
  
  const [isTyping, setIsTyping] = useState(false);
  const [processedContent, setProcessedContent] = useState('');
  const [isPasted, setIsPasted] = useState(false);
  
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showNoteLinker, setShowNoteLinker] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Effect to apply NLH-processed content and restore the cursor
  useEffect(() => {
    // Only apply changes if NLH is enabled, user is not typing, and new content is available
    if (editorRef.current && processedContent && processedContent !== content && !isTyping && nlhEnabled && settings.globalEnabled) {
      console.log('[Editor] Applying processed content from NLH.');
      console.log('  -> Current content prop:', JSON.stringify(content));
      console.log('  -> New processed content:', JSON.stringify(processedContent));
      
      const selection = window.getSelection();
      let cursorPosition = -1;
      if (selection?.focusNode && editorRef.current.contains(selection.focusNode)) {
        cursorPosition = getCursorPosition(editorRef.current);
      }
      
      editorRef.current.innerHTML = processedContent;
      
      if (cursorPosition !== -1) {
        setCursorPosition(editorRef.current, cursorPosition);
      }
    }
  }, [processedContent, content, isTyping, nlhEnabled, settings.globalEnabled]);

  const handleProcessedContent = useCallback((processed: string) => {
    console.log('[Editor] Received processed content from NLHHighlighter:', JSON.stringify(processed));
    setProcessedContent(processed);
  }, []);

  const handleFormat = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    
    if (command === 'insertHTML' && value) {
      // For inserting HTML (like images), use the modern approach
      range.deleteContents();
      const div = document.createElement('div');
      div.innerHTML = value;
      const fragment = document.createDocumentFragment();
      while (div.firstChild) {
        fragment.appendChild(div.firstChild);
      }
      range.insertNode(fragment);
    } else {
      // For formatting commands (bold, italic, underline), apply styling directly
      if (range.collapsed) {
        // If no text is selected, insert a placeholder and format it
        // This gives immediate visual feedback and proper cursor placement
        const placeholder = document.createTextNode('\u200B'); // Zero-width space
        let wrapper: HTMLElement;
        
        switch (command) {
          case 'bold':
            wrapper = document.createElement('strong');
            break;
          case 'italic':
            wrapper = document.createElement('em');
            break;
          case 'underline':
            wrapper = document.createElement('u');
            break;
          default:
            // For unsupported commands, just return
            console.warn(`Command '${command}' not supported by modern implementation`);
            return;
        }
        
        wrapper.appendChild(placeholder);
        range.insertNode(wrapper);
        
        // Position cursor inside the formatted element
        const newRange = document.createRange();
        newRange.setStartAfter(placeholder);
        newRange.setEndAfter(placeholder);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Text is selected, wrap it with appropriate formatting
        const selectedText = range.extractContents();
        let wrapper: HTMLElement;
        
        switch (command) {
          case 'bold':
            wrapper = document.createElement('strong');
            break;
          case 'italic':
            wrapper = document.createElement('em');
            break;
          case 'underline':
            wrapper = document.createElement('u');
            break;
          default:
            // For unsupported commands, just reinsert the content
            console.warn(`Command '${command}' not supported by modern implementation`);
            range.insertNode(selectedText);
            return;
        }
        
        wrapper.appendChild(selectedText);
        range.insertNode(wrapper);
        
        // Restore selection to the formatted content
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateFormatState();
  };

  const updateFormatState = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      return;
    }

    // Get the current element at the cursor position
    const range = selection.getRangeAt(0);
    const currentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentElement 
      : range.commonAncestorContainer as Element;

    if (!currentElement || !editorRef.current.contains(currentElement)) {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      return;
    }

    // Check for formatting by traversing up the DOM tree
    let element = currentElement;
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;

    while (element && editorRef.current.contains(element)) {
      if (element instanceof HTMLElement) {
        const computedStyle = window.getComputedStyle(element);
        const tagName = element.tagName.toLowerCase();
        
        // Check for bold
        if (!isBold && (
          tagName === 'b' || 
          tagName === 'strong' || 
          computedStyle.fontWeight === 'bold' || 
          parseInt(computedStyle.fontWeight) >= 600
        )) {
          isBold = true;
        }

        // Check for italic
        if (!isItalic && (
          tagName === 'i' || 
          tagName === 'em' || 
          computedStyle.fontStyle === 'italic'
        )) {
          isItalic = true;
        }

        // Check for underline
        if (!isUnderline && (
          tagName === 'u' || 
          computedStyle.textDecoration.includes('underline')
        )) {
          isUnderline = true;
        }
      }

      element = element.parentElement;
      if (element === editorRef.current) break;
    }

    setIsBold(isBold);
    setIsItalic(isItalic);
    setIsUnderline(isUnderline);
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
  link.className = 'underline';
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
      const { error: uploadError } = await supabase.storage.from('note-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('note-images').getPublicUrl(filePath);
      const imageHtml = `<img src="${data.publicUrl}" alt="Uploaded image" class="max-w-full h-auto rounded-lg my-2" />`;
      handleFormat('insertHTML', imageHtml);
      toast({ title: "Image uploaded", description: "Image has been added to your note." });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ variant: "destructive", title: "Upload failed", description: "Failed to upload image. Please try again." });
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Try to get HTML content first (preserves formatting), fallback to plain text
    let htmlContent = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    // If no HTML content or it's just basic HTML, convert plain text to HTML with proper formatting
    if (!htmlContent || htmlContent.trim() === plainText.trim()) {
      // Convert plain text to HTML, preserving line breaks and paragraphs
      htmlContent = plainText
        .split('\n\n') // Split by double newlines (paragraphs)
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0)
        .map(paragraph => {
          // Handle single line breaks within paragraphs
          const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          if (lines.length === 1) {
            return `<p>${lines[0]}</p>`;
          } else {
            return `<p>${lines.join('<br>')}</p>`;
          }
        })
        .join('');
      
      // If no paragraphs were created, just wrap in a single paragraph with line breaks
      if (!htmlContent) {
        htmlContent = `<p>${plainText.split('\n').join('<br>')}</p>`;
      }
    }
    
    // Count lines for chunked processing detection
    const lineCount = plainText.split('\n').length;
    
    // Set flag to indicate this is pasted content - only for large pastes
    if (lineCount > CHUNK_SIZE_THRESHOLD) {
      setIsPasted(true);
    }
    
    // Use modern Selection API to insert formatted content
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Create a document fragment from the HTML content
      const div = document.createElement('div');
      div.innerHTML = htmlContent;
      const fragment = document.createDocumentFragment();
      
      // Move all nodes from div to fragment
      while (div.firstChild) {
        fragment.appendChild(div.firstChild);
      }
      
      range.insertNode(fragment);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger content change
      if (editorRef.current) {
        console.log('[Editor] onPaste caused a change. Reading innerHTML:', JSON.stringify(editorRef.current.innerHTML));
        onChange(editorRef.current.innerHTML);
      }
    }
    
    // Reset the flag after processing is complete - longer delay for large content
    const resetDelay = lineCount > CHUNK_SIZE_THRESHOLD ? 1000 : 100;
    setTimeout(() => {
      setIsPasted(false);
    }, resetDelay);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setIsTyping(true);
      
      // Clear isPasted flag when user starts typing (not pasting)
      if (isPasted) {
        setIsPasted(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 500);

      const currentHTML = editorRef.current.innerHTML;
      console.log('[Editor] onInput fired. Reading innerHTML:', JSON.stringify(currentHTML));

      
      let newContent = currentHTML.replace(/\[ \]/g, '<input type="checkbox" class="mr-2" />');
      newContent = newContent.replace(/\[x\]/g, '<input type="checkbox" checked class="mr-2" />');
      
      if (newContent.slice(-2) === '[[') {
        setShowNoteLinker(true);
      }
      
      console.log('[Editor] Calling onChange with content:', JSON.stringify(newContent));
      onChange(newContent);
    }
  };

  const handleNoteLink = (note: Note) => {
    if (editorRef.current) {
      const link = document.createElement('a');
      link.href = `/note/${note.id}`;
      link.textContent = note.title;
  link.className = 'underline';

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(link);
        onChange(editorRef.current.innerHTML);
      }

      setShowNoteLinker(false);
    }
  };
  
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML && !isTyping) {
      console.log('[Editor] Syncing editor content with prop. isTyping:', isTyping);
      console.log('  -> Editor innerHTML:', JSON.stringify(editorRef.current.innerHTML));
      console.log('  -> New content prop:', JSON.stringify(content));
      
      const selection = window.getSelection();
      let cursorPosition = -1;
      if (selection?.focusNode && editorRef.current.contains(selection.focusNode)) {
          cursorPosition = getCursorPosition(editorRef.current);
      }
      
      editorRef.current.innerHTML = content;
      
      if (cursorPosition !== -1) {
          setCursorPosition(editorRef.current, cursorPosition);
      }
    }
  }, [content, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Button variant={isBold ? 'default' : 'outline'} size="sm" onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant={isItalic ? 'default' : 'outline'} size="sm" onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant={isUnderline ? 'default' : 'outline'} size="sm" onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }}>
          <Underline className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={handleLinkClick}>
          <Link className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant={nlhEnabled ? "default" : "outline"} size="sm" onClick={onNLHToggle}>
          <Palette className="h-4 w-4" />
          {nlhEnabled ? 'NLH On' : 'NLH Off'}
        </Button>
      </div>

      {/* Link Input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 p-3 bg-muted">
          <Input ref={linkInputRef} placeholder="Enter URL..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && insertLink()} onKeyDown={(e) => e.key === 'Escape' && setShowLinkInput(false)} />
          <Button size="sm" onClick={insertLink}>Add Link</Button>
          <Button variant="outline" size="sm" onClick={() => setShowLinkInput(false)}>Cancel</Button>
        </div>
      )}

      {/* Note Linker */}
      {showNoteLinker && (
        <div className="absolute z-10 bg-card border rounded-md shadow-lg">
          <div className="p-2"><Input placeholder="Search notes..." /></div>
          <ScrollArea className="h-40">
            <div className="p-2 space-y-1">
              {notes.map((note) => (
                <div key={note.id} className="p-2 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleNoteLink(note)}>
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
          className="w-full h-full p-4 outline-none prose prose-sm max-w-none break-words"
          style={{ minHeight: '100%' }}
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
        isPasted={isPasted}
      />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}