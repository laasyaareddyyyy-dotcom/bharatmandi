import { supabase, isSupabaseConfigured } from './supabase';

export type TicketPriority = 'low' | 'normal' | 'high';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  shop_name: string;
  user_name: string;
  user_phone: string;
  category: string;
  priority: TicketPriority;
  subject: string;
  message: string;
  status: TicketStatus;
  admin_note: string;
}

export type NewTicketInput = Omit<
  Ticket,
  'id' | 'created_at' | 'updated_at' | 'status' | 'admin_note'
>;

const LOCAL_STORAGE_TICKETS_KEY = 'bharatmandi_supabase_tickets_v1';

function getLocalTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as Ticket[];
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveLocalTickets(tickets: Ticket[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Creates a new support ticket in Supabase `tickets` table (and local fallback)
 */
export async function createTicketInSupabase(
  input: NewTicketInput
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  const newTicket: Ticket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shop_name: input.shop_name.trim(),
    user_name: input.user_name.trim(),
    user_phone: input.user_phone.trim(),
    category: input.category || 'General',
    priority: input.priority || 'normal',
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: 'open',
    admin_note: '',
  };

  // Local fallback save
  const currentLocal = getLocalTickets();
  const updatedLocal = [newTicket, ...currentLocal];
  saveLocalTickets(updatedLocal);

  // Firestore Cloud Database save
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'global_tickets', newTicket.id), newTicket, { merge: true });
  } catch (err) {
    console.warn('Firestore create ticket notice:', err);
  }

  if (!isSupabaseConfigured()) {
    return { success: true, ticket: newTicket };
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          shop_name: newTicket.shop_name,
          user_name: newTicket.user_name,
          user_phone: newTicket.user_phone,
          category: newTicket.category,
          priority: newTicket.priority,
          subject: newTicket.subject,
          message: newTicket.message,
          status: 'open',
          admin_note: '',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase insert ticket notice (using local copy):', error.message);
      return { success: true, ticket: newTicket };
    }

    if (data) {
      const dbTicket: Ticket = {
        id: String(data.id),
        created_at: String(data.created_at),
        updated_at: String(data.updated_at),
        user_id: data.user_id ? String(data.user_id) : undefined,
        shop_name: String(data.shop_name || ''),
        user_name: String(data.user_name || ''),
        user_phone: String(data.user_phone || ''),
        category: String(data.category || 'General'),
        priority: (data.priority as TicketPriority) || 'normal',
        subject: String(data.subject || ''),
        message: String(data.message || ''),
        status: (data.status as TicketStatus) || 'open',
        admin_note: String(data.admin_note || ''),
      };
      return { success: true, ticket: dbTicket };
    }

    return { success: true, ticket: newTicket };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create ticket';
    console.warn('Supabase insert ticket exception:', message);
    return { success: true, ticket: newTicket };
  }
}

/**
 * Fetches tickets from Supabase `tickets` table
 */
export async function fetchTicketsFromSupabase(
  filterUserPhone?: string
): Promise<{ success: boolean; tickets: Ticket[]; error?: string }> {
  let localList = getLocalTickets();

  // Query Firestore Cloud Database first for tickets
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const snap = await getDocs(collection(db, 'global_tickets'));
    if (!snap.empty) {
      const fsTickets: Ticket[] = [];
      snap.forEach((d) => {
        if (d.exists()) {
          fsTickets.push(d.data() as Ticket);
        }
      });
      if (fsTickets.length > 0) {
        const fsIds = new Set(fsTickets.map((t) => t.id));
        const remainingLocal = localList.filter((t) => !fsIds.has(t.id));
        localList = [...fsTickets, ...remainingLocal];
        saveLocalTickets(localList);
      }
    }
  } catch (err) {
    console.warn('Firestore fetch tickets notice:', err);
  }

  if (!isSupabaseConfigured()) {
    if (filterUserPhone) {
      const filtered = localList.filter(
        (t) => t.user_phone.replace(/\D/g, '') === filterUserPhone.replace(/\D/g, '')
      );
      return { success: true, tickets: filtered };
    }
    return { success: true, tickets: localList };
  }

  try {
    let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });

    if (filterUserPhone) {
      const cleanPhone = filterUserPhone.replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        query = query.or(`user_phone.eq.${cleanPhone},user_phone.eq.+91${cleanPhone}`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch tickets notice (using local fallback):', error.message);
      return { success: true, tickets: localList };
    }

    if (data && Array.isArray(data)) {
      const remoteTickets: Ticket[] = data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        created_at: String(item.created_at || new Date().toISOString()),
        updated_at: String(item.updated_at || new Date().toISOString()),
        user_id: item.user_id ? String(item.user_id) : undefined,
        shop_name: String(item.shop_name || ''),
        user_name: String(item.user_name || ''),
        user_phone: String(item.user_phone || ''),
        category: String(item.category || 'General'),
        priority: (item.priority as TicketPriority) || 'normal',
        subject: String(item.subject || ''),
        message: String(item.message || ''),
        status: (item.status as TicketStatus) || 'open',
        admin_note: String(item.admin_note || ''),
      }));

      // Merge remote with local items not in remote
      const remoteIds = new Set(remoteTickets.map((t) => t.id));
      const extraLocal = localList.filter((t) => !remoteIds.has(t.id));
      const combined = [...remoteTickets, ...extraLocal];
      saveLocalTickets(combined);

      return { success: true, tickets: combined };
    }

    return { success: true, tickets: localList };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching tickets';
    console.warn('Supabase fetch tickets exception:', message);
    return { success: true, tickets: localList };
  }
}

/**
 * Updates a ticket's status and/or admin_note in Supabase
 */
export async function updateTicketInSupabase(
  ticketId: string,
  status: TicketStatus,
  admin_note?: string
): Promise<{ success: boolean; error?: string }> {
  const currentLocal = getLocalTickets();
  const index = currentLocal.findIndex((t) => t.id === ticketId);
  if (index !== -1) {
    currentLocal[index] = {
      ...currentLocal[index],
      status,
      admin_note: admin_note !== undefined ? admin_note : currentLocal[index].admin_note,
      updated_at: new Date().toISOString(),
    };
    saveLocalTickets(currentLocal);
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const updateObj: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (admin_note !== undefined) {
      updateObj.admin_note = admin_note;
    }

    const { error } = await supabase.from('tickets').update(updateObj).eq('id', ticketId);

    if (error) {
      console.warn('Supabase update ticket notice:', error.message);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating ticket';
    console.warn('Supabase update ticket exception:', message);
    return { success: true };
  }
}

/**
 * Deletes a ticket in Supabase
 */
export async function deleteTicketFromSupabase(
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  const currentLocal = getLocalTickets().filter((t) => t.id !== ticketId);
  saveLocalTickets(currentLocal);

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (error) {
      console.warn('Supabase delete ticket notice:', error.message);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting ticket';
    console.warn('Supabase delete ticket exception:', message);
    return { success: true };
  }
}

/**
 * Subscribes to Supabase Realtime changes on `tickets` table
 */
export function subscribeToSupabaseTickets(onUpdate: () => void): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('tickets_realtime_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
