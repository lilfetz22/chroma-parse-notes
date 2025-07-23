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

  // Apply processed content to editor
  useEffect(() => {
    console.log('🔄 RichTextEditor: Checking if processed content should be applied:', {
      hasEditorRef: !!editorRef.current,
      processedContentDifferent: processedContent !== content,
      isProcessingNLH,
      processedContentLength: processedContent.length,
      contentLength: content.length
    });

    if (editorRef.current && processedContent !== content && !isProcessingNLH) {
      console.log('🎯 RichTextEditor: Applying processed content to editor');
      
      const currentSelection = window.getSelection();
      const currentRange = currentSelection?.rangeCount ? currentSelection.getRangeAt(0) : null;
      
      // Store cursor position
      let cursorOffset = 0;
      if (currentRange && editorRef.current.contains(currentRange.startContainer)) {
        cursorOffset = currentRange.startOffset;
        console.log('📍 RichTextEditor: Storing cursor position:', cursorOffset);
      }
      
      console.log('📝 RichTextEditor: Setting innerHTML to processed content');
      editorRef.current.innerHTML = processedContent;
      
      // Restore cursor position if possible
      if (currentSelection && currentRange) {
        try {
          console.log('📍 RichTextEditor: Attempting to restore cursor position');
          const newRange = document.createRange();
          const textNodes = [];
          const walker = document.createTreeWalker(
            editorRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          while (node = walker.nextNode()) {
            textNodes.push(node);
          }
          
          console.log('📍 RichTextEditor: Found text nodes:', textNodes.length);
          
          if (textNodes.length > 0) {
            const targetNode = textNodes[0];
            const offset = Math.min(cursorOffset, targetNode.textContent?.length || 0);
            newRange.setStart(targetNode, offset);
            newRange.setEnd(targetNode, offset);
            currentSelection.removeAllRanges();
            currentSelection.addRange(newRange);
            console.log('✅ RichTextEditor: Cursor position restored');
          }
        } catch (error) {
          console.error('❌ RichTextEditor: Error restoring cursor position:', error);
        }
      }
    } else {
      console.log('⏭️ RichTextEditor: Skipping content application:', {
        reason: !editorRef.current ? 'no editor ref' : 
                processedContent === content ? 'no changes' : 
                isProcessingNLH ? 'processing NLH' : 'unknown'
      });
    }
  }, [processedContent, content, isProcessingNLH]);

  const handleProcessedContent = useCallback((processed: string) => {
    console.log('📥 RichTextEditor: Received processed content from NLHHighlighter:', {
      processedLength: processed.length,
      originalLength: content.length,
      hasChanges: processed !== content,
      processedPreview: processed.substring(0, 100)
    });
    
    setIsProcessingNLH(true);
    setProcessedContent(processed);
    // Small delay to ensure the content is applied before allowing further processing
    setTimeout(() => {
      console.log('⏰ RichTextEditor: NLH processing timeout completed');
      setIsProcessingNLH(false);
    }, 50);
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
      let newContent = editorRef.current.innerHTML;
      
      // Convert checkboxes
      newContent = newContent.replace(/\[ \]/g, '<input type="checkbox" class="mr-2" />');
      newContent = newContent.replace(/\[x\]/g, '<input type="checkbox" checked class="mr-2" />');

      if (newContent.slice(-2) === '[[') {
        setShowNoteLinker(true);
      }
      
      onChange(newContent);
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
    if (editorRef.current && content !== editorRef.current.innerHTML && !isProcessingNLH) {
      editorRef.current.innerHTML = content;
    }
  }, [content, isProcessingNLH]);

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
          className="w-full h-full p-4 outline-none prose prose-sm max-w-none text-black"
          style={{ 
            minHeight: '100%',
            color: 'black'
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