import { supabase } from './supabase';

export interface ClientItem {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  instagram: string;
  manual_purchases_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  total_purchases?: number;
  full_name?: string;
}

export interface ClientPurchaseRecord {
  id: string;
  beat_name: string;
  license_type: string;
  amount: number;
  currency: string;
  created_at: string;
}

const LOCAL_STORAGE_CLIENTS_KEY = 'beatlab_clients_cache_v1';

export function getLocalClients(userId: string): ClientItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_CLIENTS_KEY}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local clients:', e);
    return [];
  }
}

export function setLocalClients(userId: string, clients: ClientItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_CLIENTS_KEY}_${userId}`, JSON.stringify(clients));
  } catch (e) {
    console.error('Error saving local clients:', e);
  }
}

export function formatClientFullName(first: string, last?: string): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  return l ? `${f} ${l}` : f;
}

export function splitFullName(raw: string): { firstName: string; lastName: string } {
  const clean = (raw || '').trim().replace(/^@/, '');
  if (!clean) return { firstName: '', lastName: '' };
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Fetches all clients for a user and calculates their total beats purchased
 * by combining manual past purchases + live recorded sales.
 */
export async function fetchClientsWithSales(userId: string): Promise<ClientItem[]> {
  let clients: ClientItem[] = [];
  let salesData: any[] = [];

  // 1. Fetch sales to match purchases
  try {
    const { data: sales } = await supabase
      .from('sales')
      .select('id, beat_name, client_name, client_id, license_type, amount, currency, created_at')
      .eq('user_id', userId);
    if (sales) salesData = sales;
  } catch (e) {
    // Sales fetch failed or offline
  }

  // 2. Fetch clients from Supabase
  const local = getLocalClients(userId);
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (data.length > 0) {
        // Merge Supabase with local clients so un-synced items aren't lost
        const remoteIds = new Set(data.map((c: any) => c.id));
        const unSyncedLocal = local.filter((loc) => !remoteIds.has(loc.id));
        const merged = [...data, ...unSyncedLocal];
        clients = merged.map((c) => ({
          ...c,
          manual_purchases_count: Number(c.manual_purchases_count || 0),
        }));
        setLocalClients(userId, clients);
      } else if (local.length > 0) {
        // Supabase table is empty or newly created, preserve local cache
        clients = local;
      } else {
        clients = [];
        setLocalClients(userId, []);
      }
    } else {
      clients = local;
    }
  } catch (e) {
    clients = local;
  }

  // 3. Compute total_purchases and full_name
  return clients.map((client) => {
    const fullName = formatClientFullName(client.first_name, client.last_name);
    const lowerName = fullName.toLowerCase();
    const lowerIg = (client.instagram || '').toLowerCase().replace(/^@/, '');
    const lowerEmail = (client.email || '').toLowerCase();

    // Count linked sales
    const linkedSalesCount = salesData.filter((s) => {
      if (s.client_id && s.client_id === client.id) return true;
      const sClient = (s.client_name || '').toLowerCase().trim();
      if (!sClient) return false;
      return (
        sClient === lowerName ||
        (lowerIg && sClient === lowerIg) ||
        (lowerEmail && sClient === lowerEmail)
      );
    }).length;

    const total_purchases = (client.manual_purchases_count || 0) + linkedSalesCount;

    return {
      ...client,
      full_name: fullName,
      total_purchases,
    };
  });
}

/**
 * Creates or updates a client.
 */
export async function saveClientRecord(
  clientData: {
    id?: string;
    first_name: string;
    last_name?: string;
    email?: string;
    instagram?: string;
    manual_purchases_count?: number;
    notes?: string;
  },
  userId: string
): Promise<ClientItem> {
  const cleanIg = (clientData.instagram || '').trim().replace(/^@/, '');
  const cleanFirst = (clientData.first_name || '').trim();
  const cleanLast = (clientData.last_name || '').trim();
  const cleanEmail = (clientData.email || '').trim().toLowerCase();
  const manualCount = Math.max(0, parseInt(String(clientData.manual_purchases_count ?? 0), 10) || 0);

  const now = new Date().toISOString();
  const id = clientData.id || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const itemToSave: ClientItem = {
    id,
    user_id: userId,
    first_name: cleanFirst,
    last_name: cleanLast,
    email: cleanEmail,
    instagram: cleanIg,
    manual_purchases_count: manualCount,
    notes: clientData.notes || '',
    created_at: now,
    updated_at: now,
  };

  // Try Supabase first
  try {
    if (clientData.id) {
      const { data, error } = await supabase
        .from('clients')
        .update({
          first_name: cleanFirst,
          last_name: cleanLast,
          email: cleanEmail,
          instagram: cleanIg,
          manual_purchases_count: manualCount,
          notes: clientData.notes || '',
          updated_at: now,
        })
        .eq('id', clientData.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) {
        itemToSave.updated_at = data.updated_at;
      }
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            first_name: cleanFirst,
            last_name: cleanLast,
            email: cleanEmail,
            instagram: cleanIg,
            manual_purchases_count: manualCount,
            notes: clientData.notes || '',
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        itemToSave.id = data.id;
        itemToSave.created_at = data.created_at;
      }
    }
  } catch (e) {
    // Supabase unavailable or table not yet migrated, fall back to local storage
  }

  // Update local storage
  const currentLocal = getLocalClients(userId);
  const existsIndex = currentLocal.findIndex((c) => c.id === itemToSave.id);
  if (existsIndex >= 0) {
    currentLocal[existsIndex] = { ...currentLocal[existsIndex], ...itemToSave };
  } else {
    currentLocal.unshift(itemToSave);
  }
  setLocalClients(userId, currentLocal);

  return {
    ...itemToSave,
    full_name: formatClientFullName(itemToSave.first_name, itemToSave.last_name),
  };
}

/**
 * Deletes a client.
 */
export async function deleteClientRecord(id: string, userId: string): Promise<boolean> {
  try {
    await supabase.from('clients').delete().eq('id', id).eq('user_id', userId);
  } catch (e) {
    // Ignore error and proceed to local cleanup
  }

  const currentLocal = getLocalClients(userId);
  const filtered = currentLocal.filter((c) => c.id !== id);
  setLocalClients(userId, filtered);
  return true;
}

/**
 * Fetches the individual beat purchases for a given client from the sales table.
 */
export async function getClientPurchaseHistory(
  clientId: string,
  clientFullName: string,
  userId: string
): Promise<ClientPurchaseRecord[]> {
  const lowerName = clientFullName.trim().toLowerCase();

  try {
    const { data } = await supabase
      .from('sales')
      .select('id, beat_name, client_name, client_id, license_type, amount, currency, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!data) return [];

    return data
      .filter((s) => {
        if (s.client_id && s.client_id === clientId) return true;
        const sClient = (s.client_name || '').toLowerCase().trim();
        return sClient && sClient === lowerName;
      })
      .map((s) => ({
        id: s.id,
        beat_name: s.beat_name || 'Untitled Beat',
        license_type: s.license_type || 'License',
        amount: Number(s.amount || 0),
        currency: s.currency || 'USD',
        created_at: s.created_at,
      }));
  } catch (e) {
    return [];
  }
}

/**
 * Finds an existing client by name or handle, or creates one if not found.
 */
export async function findOrCreateClientByName(
  rawName: string,
  userId: string,
  extra?: { email?: string; instagram?: string }
): Promise<ClientItem> {
  const cleanName = (rawName || '').trim();
  if (!cleanName) {
    throw new Error('Client name cannot be empty');
  }

  const existingClients = await fetchClientsWithSales(userId);
  const lowerTarget = cleanName.toLowerCase().replace(/^@/, '');

  const match = existingClients.find((c) => {
    const fullName = formatClientFullName(c.first_name, c.last_name).toLowerCase();
    const ig = (c.instagram || '').toLowerCase().replace(/^@/, '');
    const email = (c.email || '').toLowerCase();

    return fullName === lowerTarget || (ig && ig === lowerTarget) || (email && email === lowerTarget);
  });

  if (match) {
    return match;
  }

  // Not found: create new client
  const { firstName, lastName } = splitFullName(cleanName);
  return saveClientRecord(
    {
      first_name: firstName,
      last_name: lastName,
      email: extra?.email || '',
      instagram: extra?.instagram || '',
      manual_purchases_count: 0,
    },
    userId
  );
}
