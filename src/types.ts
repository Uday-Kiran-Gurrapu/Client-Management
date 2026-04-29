export interface Contact {
  id: string;
  name: string;
  role?: string;
  email: string;
  phone: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Client {
  id: string;
  companyName: string;
  contacts: Contact[];
  createdAt: string;
  contractStart?: string;
  contractEnd?: string;
  contractStatus?: 'active' | 'ended';
  attachments?: Attachment[];
  notes?: string;
}
