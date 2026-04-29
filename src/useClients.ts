import { useState } from 'react';
import type { Attachment, Client, Contact } from './types';
import { storeFile, removeFile } from './fileStore';

const STORAGE_KEY = 'client-manager-data';

function load(): Client[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(clients: Client[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>(load);

  function update(next: Client[]) {
    save(next);
    setClients(next);
  }

  function addClient(companyName: string): string | null {
    const norm = companyName.toLowerCase().trim();
    if (clients.some((c) => c.companyName.toLowerCase().trim() === norm)) return null;
    const client: Client = {
      id: crypto.randomUUID(),
      companyName,
      contacts: [],
      createdAt: new Date().toISOString(),
    };
    update([...clients, client]);
    return client.id;
  }

  function renameClient(id: string, newName: string): string | null {
    const trimmed = newName.trim();
    const norm = trimmed.toLowerCase();
    if (clients.some((c) => c.id !== id && c.companyName.toLowerCase().trim() === norm)) return null;
    update(clients.map((c) => (c.id === id ? { ...c, companyName: trimmed } : c)));
    return trimmed;
  }

  function deleteClient(id: string) {
    update(clients.filter((c) => c.id !== id));
  }

  function addContact(clientId: string, contact: Omit<Contact, 'id'>) {
    update(
      clients.map((c) =>
        c.id === clientId
          ? { ...c, contacts: [...c.contacts, { id: crypto.randomUUID(), ...contact }] }
          : c
      )
    );
  }

  function updateContact(clientId: string, contact: Contact) {
    update(
      clients.map((c) =>
        c.id === clientId
          ? { ...c, contacts: c.contacts.map((p) => (p.id === contact.id ? contact : p)) }
          : c
      )
    );
  }

  function deleteContact(clientId: string, contactId: string) {
    update(
      clients.map((c) =>
        c.id === clientId
          ? { ...c, contacts: c.contacts.filter((p) => p.id !== contactId) }
          : c
      )
    );
  }

  function setContract(clientId: string, startDate: string, endDate: string) {
    update(
      clients.map((c) =>
        c.id === clientId
          ? { ...c, contractStart: startDate, contractEnd: endDate, contractStatus: 'active' as const }
          : c
      )
    );
  }

  function endContract(clientId: string) {
    update(
      clients.map((c) =>
        c.id === clientId ? { ...c, contractStatus: 'ended' as const } : c
      )
    );
  }

  async function addAttachments(clientId: string, files: File[]): Promise<void> {
    const newAttachments: Attachment[] = [];
    for (const file of files) {
      const id = crypto.randomUUID();
      await storeFile(id, file);
      newAttachments.push({
        id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    update(
      clients.map((c) =>
        c.id === clientId
          ? { ...c, attachments: [...(c.attachments ?? []), ...newAttachments] }
          : c
      )
    );
  }

  async function deleteAttachment(clientId: string, attachmentId: string): Promise<void> {
    await removeFile(attachmentId);
    update(
      clients.map((c) =>
        c.id === clientId
          ? { ...c, attachments: (c.attachments ?? []).filter((a) => a.id !== attachmentId) }
          : c
      )
    );
  }

  function updateNotes(clientId: string, notes: string) {
    update(clients.map((c) => c.id === clientId ? { ...c, notes } : c));
  }

  function importData(incoming: Client[]) {
    update(incoming);
  }

  return {
    clients, addClient, renameClient, deleteClient,
    addContact, updateContact, deleteContact,
    setContract, endContract,
    addAttachments, deleteAttachment,
    updateNotes, importData,
  };
}
