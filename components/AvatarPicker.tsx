'use client';

import {
  AVATAR_PRESETS,
  presetSvgDataUri,
  useAvatar,
  type AvatarPreference,
} from '@/lib/avatar';
import { CheckIcon } from '@heroicons/react/24/solid';

function isSelected(preference: AvatarPreference | null, candidate: AvatarPreference): boolean {
  if (!preference) return false;
  if (candidate.type !== preference.type) return false;
  if (candidate.type === 'oauth') return preference.type === 'oauth';
  if (candidate.type === 'preset' && preference.type === 'preset') {
    return candidate.id === preference.id;
  }
  return false;
}

export default function AvatarPicker() {
  const { user, preference, setPreference, hasOAuthPhoto } = useAvatar();

  return (
    <div className="px-4 py-3 border-b border-neutral-100">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
        Avatar
      </p>

      {hasOAuthPhoto && (
        <button
          type="button"
          onClick={() => setPreference({ type: 'oauth' })}
          className={`flex items-center gap-3 w-full mb-3 px-2 py-2 rounded-lg transition-colors ${
            isSelected(preference, { type: 'oauth' })
              ? 'bg-primary-50 ring-1 ring-primary-200'
              : 'hover:bg-neutral-50'
          }`}
        >
          <img
            src={user?.profilePictureUrl ?? ''}
            alt="Profile photo"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm text-neutral-700">Use profile photo</span>
          {isSelected(preference, { type: 'oauth' }) && (
            <CheckIcon className="w-4 h-4 text-primary-600 ml-auto" />
          )}
        </button>
      )}

      <p className="text-xs text-neutral-500 mb-2">Medical presets</p>
      <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto">
        {AVATAR_PRESETS.map((preset) => {
          const candidate: AvatarPreference = { type: 'preset', id: preset.id };
          const selected = isSelected(preference, candidate);
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => setPreference(candidate)}
              className={`relative rounded-full p-0.5 transition-all ${
                selected ? 'ring-2 ring-primary-600' : 'ring-1 ring-neutral-200 hover:ring-neutral-300'
              }`}
            >
              <img
                src={presetSvgDataUri(preset)}
                alt={preset.label}
                className="w-full aspect-square rounded-full"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
