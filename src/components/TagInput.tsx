import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Tag } from '@/types/kanban';
import { useAuth } from '@/hooks/useAuth'; // --- MODIFICATION: Import useAuth hook

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
}

const DEFAULT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-gray-500',
];

export function TagInput({ selectedTags, onTagsChange, placeholder = "Type to search or create tags..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth(); // --- MODIFICATION: Get the current user

  // --- MODIFICATION: Load user's existing tags from Supabase
  const loadUserTags = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, [user]);

  useEffect(() => {
    loadUserTags();
  }, [loadUserTags]);

  // Filter tags based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.some(selected => selected.id === tag.id)
      );
      setFilteredTags(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowSuggestions(false);
    }
  }, [inputValue, availableTags, selectedTags]);

  // --- MODIFICATION: Create a new tag in the database
  const createNewTag = async (name: string) => {
    if (!user) {
      console.error("Cannot create tag: user is not logged in.");
      return;
    }

    setIsLoading(true);
    try {
      const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
      
      const { data: newTag, error } = await supabase
        .from('tags')
        .insert({
          name: name.trim(),
          color: randomColor,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (newTag) {
        setAvailableTags(prev => [...prev, newTag]);
        onTagsChange([...selectedTags, newTag]); // Pass the new tag from the DB back to the parent
        setInputValue('');
      }

    } catch (error: any) {
      // Handle case where tag with the same name already exists for the user
      if (error.code === '23505') { // Unique constraint violation
        console.warn('Tag already exists.');
        const existingTag = availableTags.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
        if (existingTag) {
          selectTag(existingTag);
        }
      } else {
        console.error('Error creating tag:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectTag = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: Tag) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      
      const exactMatch = availableTags.find(tag => 
        tag.name.toLowerCase() === inputValue.toLowerCase() &&
        !selectedTags.some(selected => selected.id === tag.id)
      );

      if (exactMatch) {
        selectTag(exactMatch);
      } else {
        createNewTag(inputValue);
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <Badge 
            key={tag.id} 
            variant="secondary" 
            className={`${tag.color} text-white flex items-center gap-1`}
          >
            {tag.name}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-1 h-auto p-0 text-white hover:bg-white/20"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={isLoading}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredTags.length > 0 && (
              <div>
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2"
                    onClick={() => selectTag(tag)}
                  >
                    <div className={`w-3 h-3 rounded-full ${tag.color}`} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Create new tag option */}
            {inputValue.trim() && 
             !availableTags.some(tag => 
               tag.name.toLowerCase() === inputValue.toLowerCase()
             ) && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 text-primary border-t"
                onClick={() => createNewTag(inputValue)}
                disabled={isLoading}
              >
                <Plus className="h-3 w-3" />
                Create "{inputValue}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}