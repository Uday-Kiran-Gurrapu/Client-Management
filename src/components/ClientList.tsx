import { useMemo, useRef, useState } from 'react';
import type { Client } from '../types';
import { daysUntil } from '../utils';

function contractBadge(client: Client): { label: string; classes: string } | null {
  if (client.contractStatus === 'ended') return { label: 'Services Ended', classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' };
  if (!client.contractEnd) return null;
  const days = daysUntil(client.contractEnd);
  if (days < 0) return { label: 'Expired', classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
  if (days <= 15) return { label: `Expires in ${days}d`, classes: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' };
  return null;
}

type SortKey = 'added' | 'az' | 'za' | 'contract';
type FilterKey = 'all' | 'active' | 'expiring' | 'ended' | 'none';

interface Props {
  clients: Client[];
  onSelect: (id: string) => void;
  onAdd: (companyName: string) => string | null;
  onImport: (data: Client[]) => void;
}

export default function ClientList({ clients, onSelect, onAdd, onImport }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [addError, setAddError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('added');
  const [filter, setFilter] = useState<FilterKey>('all');
  const importRef = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault();
    const name = companyName.trim();
    if (!name) return;
    const result = onAdd(name);
    if (result === null) { setAddError('A client with this name already exists.'); return; }
    setCompanyName('');
    setAddError('');
    setShowForm(false);
  }

  function handleExport() {
    const json = JSON.stringify(clients, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `la-creative-clients-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error();
      const msg = `Replace all ${clients.length} existing client${clients.length !== 1 ? 's' : ''} with ${data.length} imported? This cannot be undone.`;
      if (window.confirm(msg)) onImport(data);
    } catch {
      window.alert('Invalid file. Please select a valid client JSON export.');
    }
    if (importRef.current) importRef.current.value = '';
  }

  const expiringSoon = useMemo(
    () => clients.filter(c => {
      if (!c.contractEnd || c.contractStatus === 'ended') return false;
      const d = daysUntil(c.contractEnd);
      return d >= 0 && d <= 30;
    }),
    [clients]
  );

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let list = q ? clients.filter(c => c.companyName.toLowerCase().includes(q)) : [...clients];
    if (filter === 'active') list = list.filter(c => c.contractEnd && c.contractStatus !== 'ended' && daysUntil(c.contractEnd) >= 0);
    if (filter === 'expiring') list = list.filter(c => c.contractEnd && c.contractStatus !== 'ended' && daysUntil(c.contractEnd) >= 0 && daysUntil(c.contractEnd) <= 30);
    if (filter === 'ended') list = list.filter(c => c.contractStatus === 'ended');
    if (filter === 'none') list = list.filter(c => !c.contractEnd);
    if (sort === 'az') return list.sort((a, b) => a.companyName.localeCompare(b.companyName));
    if (sort === 'za') return list.sort((a, b) => b.companyName.localeCompare(a.companyName));
    if (sort === 'contract') return list.sort((a, b) => {
      if (!a.contractEnd) return 1;
      if (!b.contractEnd) return -1;
      return a.contractEnd.localeCompare(b.contractEnd);
    });
    return list;
  }, [clients, search, sort, filter]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">✕</button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="added">Date Added</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="contract">Contract End</option>
        </select>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring</option>
          <option value="ended">Ended</option>
          <option value="none">No Contract</option>
        </select>

        {/* Add */}
        <button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
        >
          + Add Client
        </button>
      </div>

      {/* Client count */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {displayed.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
        {search && ` matching "${search}"`}
      </p>

      {/* ── Contract renewal reminder ── */}
      {expiringSoon.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-2xl px-5 py-3.5 mb-5 flex items-start gap-3">
          <span className="text-orange-500 text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              {expiringSoon.length} contract{expiringSoon.length !== 1 ? 's' : ''} expiring within 30 days
            </p>
            <p className="text-xs text-orange-500 dark:text-orange-500 mt-0.5">
              {expiringSoon.map(c => c.companyName).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Add Client form ── */}
      {showForm && (
        <div className="bg-white/90 dark:bg-gray-900/90 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-5 mb-5 shadow-md">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">New Client</h2>
          <form onSubmit={handleAdd} className="flex gap-3">
            <div className="flex-1">
              <input
                autoFocus
                type="text"
                placeholder="Company name"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setAddError(''); }}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
            </div>
            <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors self-start">Save</button>
            <button type="button" onClick={() => { setShowForm(false); setCompanyName(''); setAddError(''); }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors self-start">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* ── Client cards ── */}
      {displayed.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">{search ? '🔍' : '🏢'}</p>
          <p className="text-sm">{search ? `No clients match "${search}"` : 'No clients yet. Add your first one.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((client) => {
            const badge = contractBadge(client);
            return (
              <div
                key={client.id}
                onClick={() => onSelect(client.id)}
                className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-purple-100 dark:border-purple-900/40 rounded-2xl px-5 py-4 flex items-center shadow-sm hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700 transition-all cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {client.companyName}
                    </p>
                    {badge && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.classes}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {client.contacts.length} contact{client.contacts.length !== 1 ? 's' : ''}
                    {client.attachments?.length ? ` · ${client.attachments.length} file${client.attachments.length !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                <span className="text-gray-300 dark:text-gray-600 group-hover:text-violet-400 transition-colors ml-3 text-sm">→</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Export / Import ── */}
      {clients.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Data:</span>
          <button
            onClick={handleExport}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            ↓ Export JSON
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            ↑ Import JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
      )}

      {/* Show import button even when no clients */}
      {clients.length === 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 border border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-300 px-4 py-2 rounded-xl transition-colors"
          >
            ↑ Import from JSON backup
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
      )}

    </div>
  );
}
