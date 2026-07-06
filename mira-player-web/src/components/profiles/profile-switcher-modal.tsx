import { useState } from 'react';
import { X, Check, Plus, Pencil, Trash2 } from 'lucide-react';

import {
  useActiveProfileId,
  useCreateProfile,
  useDeleteProfile,
  useProfiles,
  useRenameProfile,
  useSwitchProfile,
} from '@/hooks/data/use-profiles';
import { useT } from '@/providers/preferences';

export function ProfileSwitcherModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <ProfileSwitcherBody onClose={onClose} />;
}

function ProfileSwitcherBody({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data: profiles = [] } = useProfiles();
  const { data: activeId } = useActiveProfileId();
  const switchProfile = useSwitchProfile();
  const createProfile = useCreateProfile();
  const renameProfile = useRenameProfile();
  const deleteProfile = useDeleteProfile();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const select = (id: string) => {
    if (id === activeId) return onClose();
    switchProfile.mutate(id, { onSuccess: onClose });
  };

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const profile = await createProfile.mutateAsync(trimmed);
    setName('');
    setCreating(false);
    switchProfile.mutate(profile.id, { onSuccess: onClose });
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const submitEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !editingId) return setEditingId(null);
    await renameProfile.mutateAsync({ id: editingId, nombre: trimmed });
    setEditingId(null);
  };

  const confirmDelete = (id: string, nombre: string) => {
    if (id === activeId) {
      window.alert(t('settings.profiles.cannotDeleteActive'));
      return;
    }
    if (window.confirm(t('settings.profiles.deleteMessage', { nombre }))) {
      deleteProfile.mutate(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] rounded-xl border border-border bg-bg flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 className="text-lg font-bold font-display text-fg">{t('settings.profiles')}</h2>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-fg">
            <X size={22} />
          </button>
        </div>
        <p className="px-5 pb-3 text-sm text-muted">{t('settings.profiles.subtitle')}</p>

        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-1 pb-4">
          {profiles.map((p) => {
            const active = p.id === activeId;
            if (editingId === p.id) {
              return (
                <div key={p.id} className="flex flex-col gap-2 py-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitEdit();
                    }}
                    className="border border-border rounded-lg px-3 py-2 bg-transparent text-fg text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-lg text-sm text-muted bg-transparent border-0 cursor-pointer">
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => void submitEdit()}
                      disabled={renameProfile.isPending}
                      className="px-3 py-2 rounded-lg font-bold text-sm bg-tint text-on-tint border-0 cursor-pointer">
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={p.id} className="flex items-center gap-1 py-1">
                <button
                  onClick={() => select(p.id)}
                  className="flex-1 flex items-center gap-3 py-1 bg-transparent border-0 cursor-pointer text-left">
                  <span className="w-9 h-9 rounded-full bg-tint text-on-tint flex items-center justify-center font-bold shrink-0">
                    {p.nombre.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-fg truncate">{p.nombre}</span>
                  {active ? <Check size={20} className="text-tint shrink-0" /> : null}
                </button>
                <button
                  onClick={() => startEdit(p.id, p.nombre)}
                  className="p-2 bg-transparent border-0 cursor-pointer text-muted shrink-0">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => confirmDelete(p.id, p.nombre)}
                  className="p-2 bg-transparent border-0 cursor-pointer text-muted shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          {creating ? (
            <div className="flex flex-col gap-2 py-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.profiles.namePlaceholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitCreate();
                }}
                className="border border-border rounded-lg px-3 py-2 bg-transparent text-fg text-sm"
              />
              <button
                onClick={() => void submitCreate()}
                disabled={createProfile.isPending}
                className="w-full py-2 rounded-lg font-bold text-sm bg-tint text-on-tint border-0 cursor-pointer">
                {t('settings.profiles.create')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-3 py-2 bg-transparent border-0 cursor-pointer text-left">
              <span className="w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0">
                <Plus size={18} className="text-muted" />
              </span>
              <span className="text-sm text-muted">{t('settings.profiles.newProfile')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
