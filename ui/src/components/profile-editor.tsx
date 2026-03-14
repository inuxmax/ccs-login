/**
 * Profile Editor - Re-export from modular structure
 * @deprecated Import from '@/components/profiles/editor' directly
 */

/* eslint-disable react-refresh/only-export-components */
export {
  ProfileEditor,
  EnvEditorSection,
  InfoSection,
  RawEditorSection,
  useProfileEditor,
  isSensitiveKey,
} from './profiles/editor';

export type { Settings, SettingsResponse, ProfileEditorProps } from './profiles/editor';
