export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  nlh_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartOfSpeechSettings {
  noun: { enabled: boolean; color: string };
  verb: { enabled: boolean; color: string };
  adverb: { enabled: boolean; color: string };
  adjective: { enabled: boolean; color: string };
  number: { enabled: boolean; color: string };
  properNoun: { enabled: boolean; color: string };
}

export interface NLHSettings {
  globalEnabled: boolean;
  partOfSpeech: PartOfSpeechSettings;
}