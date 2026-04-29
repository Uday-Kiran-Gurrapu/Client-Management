import { useRef, useState } from 'react';
import type { Attachment, Client, Contact } from '../types';
import { loadFile } from '../fileStore';
import { daysUntil } from '../utils';

interface Props {
  client: Client;
  onBack: () => void;
  onRename: (name: string) => string | null;
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onSetContract: (startDate: string, endDate: string) => void;
  onEndContract: () => void;
  onAddAttachments: (files: File[]) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onDelete: () => void;
  onUpdateNotes: (notes: string) => void;
}

const emptyContact = { name: '', role: '', email: '', phone: '' };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileBadge(name: string): { label: string; classes: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { label: string; classes: string }> = {
    pdf:  { label: 'PDF',  classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    doc:  { label: 'DOC',  classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    docx: { label: 'DOC',  classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    xls:  { label: 'XLS',  classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    xlsx: { label: 'XLS',  classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    png:  { label: 'IMG',  classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    jpg:  { label: 'IMG',  classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    jpeg: { label: 'IMG',  classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    gif:  { label: 'IMG',  classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    webp: { label: 'IMG',  classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    zip:  { label: 'ZIP',  classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    rar:  { label: 'ZIP',  classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  };
  return map[ext] ?? { label: 'FILE', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
}

async function downloadAttachment(attachment: Attachment) {
  const file = await loadFile(attachment.id);
  if (!file) return;
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Shared style tokens ──────────────────────────────────────────
const card = 'bg-white/90 dark:bg-gray-900/90 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-5 shadow-md';
const cardFlat = 'bg-white/80 dark:bg-gray-900/80 border border-purple-100 dark:border-purple-900/40 rounded-2xl px-5 py-4 shadow-sm';
const cardHover = `${cardFlat} hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all`;
const cardDashed = 'bg-white/60 dark:bg-gray-900/60 border border-dashed border-purple-200 dark:border-purple-900/40 rounded-2xl';
const input = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500';
const btnPrimary = 'bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors';
const btnGhost = 'text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors';
const btnMicro = 'text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md transition-colors';

export default function ClientDetail({
  client, onBack, onRename,
  onAddContact, onUpdateContact, onDeleteContact,
  onSetContract, onEndContract,
  onAddAttachments, onDeleteAttachment,
  onDelete, onUpdateNotes,
}: Props) {

  // Rename state
  const [renamingClient, setRenamingClient] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameError, setRenameError] = useState('');

  // Contact state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteContactConfirm, setDeleteContactConfirm] = useState<string | null>(null);

  // Contract state
  const [contractMode, setContractMode] = useState<'view' | 'edit'>('view');
  const [contractDraft, setContractDraft] = useState({ startDate: '', endDate: '' });
  const [endConfirm, setEndConfirm] = useState(false);

  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachConfirm, setDeleteAttachConfirm] = useState<string | null>(null);

  // Delete client state
  const [deleteClientConfirm, setDeleteClientConfirm] = useState(false);

  // ── Contact handlers ──────────────────────────────
  function handleContactField(field: keyof typeof emptyContact, value: string) {
    if (editingContact) setEditingContact({ ...editingContact, [field]: value });
    else setContactForm({ ...contactForm, [field]: value });
  }

  function handleAddContact(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    onAddContact(contactForm);
    setContactForm(emptyContact);
    setShowContactForm(false);
  }

  function handleUpdateContact(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!editingContact || !editingContact.name.trim()) return;
    onUpdateContact(editingContact);
    setEditingContact(null);
  }

  // ── Rename handler ────────────────────────────────
  function handleRename(e: React.SyntheticEvent) {
    e.preventDefault();
    const name = renameDraft.trim();
    if (!name) return;
    const result = onRename(name);
    if (result === null) { setRenameError('A client with this name already exists.'); return; }
    setRenamingClient(false);
    setRenameError('');
  }

  // ── Contract handlers ─────────────────────────────
  function openContractForm() {
    setContractDraft({ startDate: client.contractStart ?? todayStr(), endDate: client.contractEnd ?? '' });
    setContractMode('edit');
  }

  function handleSaveContract(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!contractDraft.startDate || !contractDraft.endDate) return;
    onSetContract(contractDraft.startDate, contractDraft.endDate);
    setContractMode('view');
  }

  // ── Notes handlers ────────────────────────────────
  function openNotesEdit() {
    setNotesDraft(client.notes ?? '');
    setEditingNotes(true);
  }

  function handleSaveNotes() {
    onUpdateNotes(notesDraft);
    setEditingNotes(false);
  }

  // ── Attachment handlers ───────────────────────────
  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    await onAddAttachments(files);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDeleteAttachment(id: string) {
    await onDeleteAttachment(id);
    setDeleteAttachConfirm(null);
  }

  // ── Derived contract values ───────────────────────
  const hasContract = !!client.contractEnd;
  const isEnded = client.contractStatus === 'ended';
  const daysLeft = hasContract ? daysUntil(client.contractEnd!) : null;
  const isExpiringSoon = hasContract && !isEnded && daysLeft !== null && daysLeft <= 15;
  const isExpired = isExpiringSoon && daysLeft !== null && daysLeft < 0;

  const currentContactForm = editingContact ?? contactForm;
  const attachments = client.attachments ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm shrink-0">
            ← Back
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          {renamingClient ? (
            <div className="min-w-0">
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setRenamingClient(false); setRenameError(''); } }}
                  className="text-xl font-bold border-b-2 border-violet-400 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none w-48 sm:w-64"
                />
                <button type="submit" className="text-xs text-violet-600 dark:text-violet-400 font-medium shrink-0">Save</button>
                <button type="button" onClick={() => { setRenamingClient(false); setRenameError(''); }} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">✕</button>
              </form>
              {renameError && <p className="text-xs text-red-500 mt-1">{renameError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{client.companyName}</h1>
              <button
                onClick={() => { setRenameDraft(client.companyName); setRenamingClient(true); setRenameError(''); }}
                className="shrink-0 text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                title="Rename client"
              >✎</button>
            </div>
          )}
        </div>
        {deleteClientConfirm ? (
          <div className="flex items-center gap-2 text-sm shrink-0">
            <span className="text-gray-500 dark:text-gray-400">Delete?</span>
            <button onClick={onDelete} className="text-red-600 font-medium hover:underline">Yes</button>
            <button onClick={() => setDeleteClientConfirm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">No</button>
          </div>
        ) : (
          <button onClick={() => setDeleteClientConfirm(true)}
            className="shrink-0 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors">
            Delete Client
          </button>
        )}
      </div>

      {/* ── Contract ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Contract</h2>
          {contractMode === 'view' && !isEnded && (
            <button onClick={openContractForm}
              className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 border border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500 px-3 py-1 rounded-md transition-colors">
              {hasContract ? 'Edit' : 'Set Contract'}
            </button>
          )}
        </div>

        {contractMode === 'edit' ? (
          <div className={card}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{hasContract ? 'Update Contract' : 'Set Contract'}</h3>
            <form onSubmit={handleSaveContract} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date *</label>
                  <input type="date" required value={contractDraft.startDate}
                    onChange={(e) => setContractDraft({ ...contractDraft, startDate: e.target.value })}
                    className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date *</label>
                  <input type="date" required value={contractDraft.endDate} min={contractDraft.startDate}
                    onChange={(e) => setContractDraft({ ...contractDraft, endDate: e.target.value })}
                    className={input} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className={btnPrimary}>Save</button>
                <button type="button" onClick={() => setContractMode('view')} className={btnGhost}>Cancel</button>
              </div>
            </form>
          </div>
        ) : !hasContract ? (
          <div className={`${cardDashed} px-5 py-6 text-center`}>
            <p className="text-sm text-gray-400 dark:text-gray-500">No contract set for this client.</p>
          </div>
        ) : isEnded ? (
          <div className={cardFlat}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400"><span className="text-gray-400 dark:text-gray-500 mr-1">Start:</span>{formatDate(client.contractStart!)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400"><span className="text-gray-400 dark:text-gray-500 mr-1">End:</span>{formatDate(client.contractEnd!)}</p>
              </div>
              <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full">Services Ended</span>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={openContractForm} className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-800 font-medium">+ Start New Contract</button>
            </div>
          </div>
        ) : (
          <>
            {isExpiringSoon && (
              <div className={`rounded-2xl px-5 py-4 mb-3 border ${isExpired ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-sm font-semibold ${isExpired ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>
                      {isExpired ? 'Contract has expired!' : `Contract ending in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`}
                    </p>
                    <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-500' : 'text-orange-500'}`}>Ends on {formatDate(client.contractEnd!)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={openContractForm} className={btnPrimary + ' !py-1.5 !px-3 !text-xs'}>Renew</button>
                    {endConfirm ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600 dark:text-gray-400">End?</span>
                        <button onClick={() => { onEndContract(); setEndConfirm(false); }} className="text-red-600 font-medium hover:underline">Yes</button>
                        <button onClick={() => setEndConfirm(false)} className="text-gray-400 hover:text-gray-600">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setEndConfirm(true)}
                        className="text-xs font-medium bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 border border-red-200 dark:border-red-800 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
                        End Services
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className={cardFlat}>
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400"><span className="text-gray-400 dark:text-gray-500 mr-1">Start:</span>{formatDate(client.contractStart!)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400"><span className="text-gray-400 dark:text-gray-500 mr-1">End:</span>{formatDate(client.contractEnd!)}</p>
                </div>
                {!isExpiringSoon && (
                  <span className="text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                    Active · {daysLeft}d left
                  </span>
                )}
              </div>
              {!isExpiringSoon && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {endConfirm ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">End services?</span>
                      <button onClick={() => { onEndContract(); setEndConfirm(false); }} className="text-red-600 font-medium hover:underline">Yes</button>
                      <button onClick={() => setEndConfirm(false)} className="text-gray-400 hover:text-gray-600">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setEndConfirm(true)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 hover:underline">End Services</button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Contacts ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Contacts</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{client.contacts.length} person{client.contacts.length !== 1 ? 's' : ''}</p>
        </div>
        {!showContactForm && !editingContact && (
          <button onClick={() => setShowContactForm(true)} className={btnPrimary}>+ Add Contact</button>
        )}
      </div>

      {(showContactForm || editingContact) && (
        <div className={`${card} mb-6`}>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{editingContact ? 'Edit Contact' : 'New Contact'}</h3>
          <form onSubmit={editingContact ? handleUpdateContact : handleAddContact} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name *</label>
              <input autoFocus type="text" placeholder="Full name" value={currentContactForm.name}
                onChange={(e) => handleContactField('name', e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role / Title</label>
              <input type="text" placeholder="e.g. CEO, Project Manager" value={currentContactForm.role ?? ''}
                onChange={(e) => handleContactField('role', e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input type="email" placeholder="email@example.com" value={currentContactForm.email}
                onChange={(e) => handleContactField('email', e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
              <input type="tel" placeholder="+1 555 000 0000" value={currentContactForm.phone}
                onChange={(e) => handleContactField('phone', e.target.value)} className={input} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>{editingContact ? 'Save Changes' : 'Add Contact'}</button>
              <button type="button" onClick={() => { setShowContactForm(false); setContactForm(emptyContact); setEditingContact(null); }} className={btnGhost}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {client.contacts.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-600 mb-8">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-sm">No contacts yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {client.contacts.map((contact) => (
            <div key={contact.id} className={`${cardHover} group`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{contact.name}</p>
                  {contact.role && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{contact.role}</p>
                  )}
                  {contact.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-gray-400 dark:text-gray-500 mr-1">✉</span>
                      <a href={`mailto:${contact.email}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{contact.email}</a>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-gray-400 dark:text-gray-500 mr-1">📞</span>
                      <a href={`tel:${contact.phone}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{contact.phone}</a>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deleteContactConfirm === contact.id ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Remove?</span>
                      <button onClick={() => { onDeleteContact(contact.id); setDeleteContactConfirm(null); }} className="text-red-600 font-medium hover:underline">Yes</button>
                      <button onClick={() => setDeleteContactConfirm(null)} className="text-gray-400 hover:text-gray-600">No</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setEditingContact(contact); setShowContactForm(false); }}
                        className={`${btnMicro} hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-700`}>Edit</button>
                      <button onClick={() => setDeleteContactConfirm(contact.id)}
                        className={`${btnMicro} hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700`}>✕</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Notes ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Notes</h2>
          {!editingNotes && (
            <button onClick={openNotesEdit}
              className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 border border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500 px-3 py-1 rounded-md transition-colors">
              {client.notes ? 'Edit' : 'Add Note'}
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className={card}>
            <textarea
              autoFocus
              rows={4}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add notes about this client…"
              className={`${input} resize-none`}
            />
            <div className="flex gap-3 mt-3">
              <button onClick={handleSaveNotes} className={btnPrimary}>Save</button>
              <button onClick={() => setEditingNotes(false)} className={btnGhost}>Cancel</button>
            </div>
          </div>
        ) : client.notes ? (
          <div className={cardFlat}>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
          </div>
        ) : (
          <div className={`${cardDashed} px-5 py-6 text-center`}>
            <p className="text-sm text-gray-400 dark:text-gray-500">No notes yet.</p>
          </div>
        )}
      </div>

      {/* ── Attachments ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Attachments</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{attachments.length} file{attachments.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`${btnPrimary} disabled:opacity-50 flex items-center gap-2`}
          >
            {uploading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uploading…</>
            ) : '+ Attach Files'}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
        </div>

        {attachments.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`${cardDashed} px-5 py-10 text-center cursor-pointer hover:border-violet-400 dark:hover:border-violet-600 transition-colors group`}
          >
            <p className="text-3xl mb-2 group-hover:scale-110 transition-transform">📎</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">Click to attach files</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">PDFs, docs, images, and more</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => {
              const badge = fileBadge(att.name);
              return (
                <div key={att.id} className={`${cardHover} group !px-4 !py-3 flex items-center gap-3`}>
                  <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg w-10 text-center ${badge.classes}`}>
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{att.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatSize(att.size)} · {formatDate(att.uploadedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => downloadAttachment(att)}
                      className={`${btnMicro} hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-700`} title="Download">↓</button>
                    {deleteAttachConfirm === att.id ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Remove?</span>
                        <button onClick={() => handleDeleteAttachment(att.id)} className="text-red-600 font-medium hover:underline">Yes</button>
                        <button onClick={() => setDeleteAttachConfirm(null)} className="text-gray-400 hover:text-gray-600">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteAttachConfirm(att.id)}
                        className={`${btnMicro} hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700`} title="Delete">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
