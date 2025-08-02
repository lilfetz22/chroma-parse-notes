import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Palette } from 'lucide-react';
import { useNLHSettings } from '@/hooks/useNLHSettings';
import { PartOfSpeechSettings } from '@/types/note';

export function SettingsDialog() {
  const { settings, updateSettings, updatePartOfSpeech } = useNLHSettings();
  const [open, setOpen] = useState(false);

  const posLabels: Record<keyof PartOfSpeechSettings, string> = {
    noun: 'Nouns',
    verb: 'Verbs', 
    adverb: 'Adverbs',
    adjective: 'Adjectives',
    number: 'Numbers',
    properNoun: 'Proper Nouns',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Natural Language Highlighting Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Settings</CardTitle>
              <CardDescription>
                Control the overall behavior of Natural Language Highlighting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Enable Natural Language Highlighting
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Master switch for all highlighting features
                  </p>
                </div>
                <Switch
                  checked={settings.globalEnabled}
                  onCheckedChange={(checked) => 
                    updateSettings({ globalEnabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Part of Speech Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Part of Speech Settings</CardTitle>
              <CardDescription>
                Customize highlighting for different types of words
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(settings.partOfSpeech).map(([key, value]) => {
                  const posKey = key as keyof PartOfSpeechSettings;
                  return (
                    <div 
                      key={key} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {posLabels[posKey]}
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Color:</Label>
                          <Input
                            type="color"
                            value={value.color}
                            onChange={(e) => 
                              updatePartOfSpeech(posKey, { color: e.target.value })
                            }
                            className="w-12 h-8 p-1 border-0"
                          />
                        </div>
                        
                        <Switch
                          checked={value.enabled}
                          onCheckedChange={(checked) => 
                            updatePartOfSpeech(posKey, { enabled: checked })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                See how your highlighting settings will look
              </CardDescription>
            </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="leading-relaxed">
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.adjective.enabled ? settings.partOfSpeech.adjective.color : 'inherit',
                        fontWeight: settings.partOfSpeech.adjective.enabled ? '500' : 'normal'
                      }}
                    >
                      Beautiful
                    </span>{' '}
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.noun.enabled ? settings.partOfSpeech.noun.color : 'inherit',
                        fontWeight: settings.partOfSpeech.noun.enabled ? '500' : 'normal'
                      }}
                    >
                      notes
                    </span>{' '}
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.verb.enabled ? settings.partOfSpeech.verb.color : 'inherit',
                        fontWeight: settings.partOfSpeech.verb.enabled ? '500' : 'normal'
                      }}
                    >
                      written
                    </span>{' '}
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.adverb.enabled ? settings.partOfSpeech.adverb.color : 'inherit',
                        fontWeight: settings.partOfSpeech.adverb.enabled ? '500' : 'normal'
                      }}
                    >
                      quickly
                    </span>{' '}
                    with{' '}
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.number.enabled ? settings.partofSpeech.number.color : 'inherit',
                        fontWeight: settings.partOfSpeech.number.enabled ? '500' : 'normal'
                      }}
                    >
                      5
                    </span>{' '}
                    different{' '}
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.noun.enabled ? settings.partOfSpeech.noun.color : 'inherit',
                        fontWeight: settings.partOfSpeech.noun.enabled ? '500' : 'normal'
                      }}
                    >
                      colors
                    </span>{' '}
                    in{' '}
                    <span 
                      style={{ 
                        color: settings.partOfSpeech.properNoun.enabled ? settings.partOfSpeech.properNoun.color : 'inherit',
                        fontWeight: settings.partOfSpeech.properNoun.enabled ? '500' : 'normal'
                      }}
                    >
                      Chroma Notes
                    </span>.
                  </p>
                </div>
              </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}