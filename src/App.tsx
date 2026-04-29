import { useEffect, useState } from 'react';
import { useClients } from './useClients';
import ClientList from './components/ClientList';
import ClientDetail from './components/ClientDetail';

function Header({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 shadow-xl">
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
      <div className="absolute top-2 right-32 w-20 h-20 rounded-full bg-white/5" />

      <div className="relative max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shadow-inner">
          <span className="text-white font-black text-base tracking-tighter leading-none">LA</span>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl leading-tight tracking-tight">LA Creative Marketing</h1>
          <p className="text-white/60 text-xs mt-0.5 tracking-wide uppercase">Client Management</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={onToggleDark}
            className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors text-base"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <div className="hidden sm:flex items-center gap-1.5 opacity-40">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const store = useClients();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const selectedClient = store.clients.find((c) => c.id === selectedId) ?? null;

  const bgStyle = {
    background: dark
      ? 'linear-gradient(135deg, #0f0e17 0%, #13101f 40%, #110e18 100%)'
      : 'linear-gradient(135deg, #f8f7ff 0%, #f0ebff 40%, #fdf4ff 100%)',
  };

  return (
    <div className="min-h-screen transition-colors duration-200" style={bgStyle}>
      <Header dark={dark} onToggleDark={() => setDark(!dark)} />
      <main>
        {selectedClient ? (
          <ClientDetail
            client={selectedClient}
            onBack={() => setSelectedId(null)}
            onRename={(name) => store.renameClient(selectedClient.id, name)}
            onAddContact={(contact) => store.addContact(selectedClient.id, contact)}
            onUpdateContact={(contact) => store.updateContact(selectedClient.id, contact)}
            onDeleteContact={(contactId) => store.deleteContact(selectedClient.id, contactId)}
            onSetContract={(start, end) => store.setContract(selectedClient.id, start, end)}
            onEndContract={() => store.endContract(selectedClient.id)}
            onAddAttachments={(files) => store.addAttachments(selectedClient.id, files)}
            onDeleteAttachment={(id) => store.deleteAttachment(selectedClient.id, id)}
            onDelete={() => { store.deleteClient(selectedClient.id); setSelectedId(null); }}
            onUpdateNotes={(notes) => store.updateNotes(selectedClient.id, notes)}
          />
        ) : (
          <ClientList
            clients={store.clients}
            onSelect={setSelectedId}
            onAdd={store.addClient}
            onImport={store.importData}
          />
        )}
      </main>
    </div>
  );
}
