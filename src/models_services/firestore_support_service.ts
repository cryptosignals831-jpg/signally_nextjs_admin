import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc
} from 'firebase/firestore';
import { SupportMessageModel, SupportModel, SupportStatus } from '../models/model.support';
import { authClient, firestoreClient } from '../_firebase/firebase_client';

export function streamAllSupports(callback: (supports: SupportModel[]) => void): Unsubscribe {
  const q = query(collection(firestoreClient, 'supports'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) =>
        SupportModel.fromJson({ ...docSnap.data(), id: docSnap.id })
      );
      list.sort((a, b) => {
        const aTime = a.timestampCreated ? new Date(a.timestampCreated).getTime() : 0;
        const bTime = b.timestampCreated ? new Date(b.timestampCreated).getTime() : 0;
        return bTime - aTime;
      });
      callback(list);
    },
    (error) => {
      console.error('streamAllSupports error:', error);
      callback([]);
    }
  );
}

export function streamSupportTicket(
  ticketId: string,
  callback: (ticket: SupportModel | null) => void
): Unsubscribe {
  const docRef = doc(firestoreClient, 'supports', ticketId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      callback(SupportModel.fromJson({ ...docSnap.data(), id: docSnap.id }));
    },
    (error) => {
      console.error('streamSupportTicket error:', error);
      callback(null);
    }
  );
}

export function streamSupportMessages(
  ticketId: string,
  callback: (messages: SupportMessageModel[]) => void
): Unsubscribe {
  const msgColl = collection(firestoreClient, 'supports', ticketId, 'messages');
  const q = query(msgColl, orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) =>
        SupportMessageModel.fromJson({ ...docSnap.data(), id: docSnap.id })
      );
      callback(msgs);
    },
    (error) => {
      console.error('streamSupportMessages error:', error);
      callback([]);
    }
  );
}

export async function apiUpdateSupportStatus(
  ticketId: string,
  status: SupportStatus
): Promise<boolean> {
  try {
    const docRef = doc(firestoreClient, 'supports', ticketId);
    await updateDoc(docRef, {
      status,
      timestampUpdated: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('apiUpdateSupportStatus error:', error);
    throw error;
  }
}

export async function apiSendAdminMessage(
  ticketId: string,
  text: string,
  adminName?: string,
  adminId?: string
): Promise<boolean> {
  try {
    const user = authClient.currentUser;
    const finalAdminId = adminId || user?.uid || 'admin';
    const finalAdminName = adminName || user?.displayName || 'Support Desk';

    const msgColl = collection(firestoreClient, 'supports', ticketId, 'messages');
    await addDoc(msgColl, {
      ticketId,
      senderId: finalAdminId,
      senderName: finalAdminName,
      senderRole: 'admin',
      text,
      isRead: false,
      timestamp: serverTimestamp()
    });

    const ticketRef = doc(firestoreClient, 'supports', ticketId);
    const updateData: Record<string, any> = {
      lastMessage: text,
      lastSender: 'admin',
      adminUnread: false,
      userUnread: true,
      timestampUpdated: serverTimestamp()
    };

    try {
      const ticketSnap = await getDoc(ticketRef);
      if (ticketSnap.exists() && ticketSnap.data()?.status === 'open') {
        updateData.status = 'in_progress';
      }
    } catch (_) {}

    await updateDoc(ticketRef, updateData);

    return true;
  } catch (error) {
    console.error('apiSendAdminMessage error:', error);
    throw error;
  }
}

export async function apiMarkSupportReadByAdmin(ticketId: string): Promise<void> {
  try {
    const docRef = doc(firestoreClient, 'supports', ticketId);
    await updateDoc(docRef, {
      adminUnread: false
    });
  } catch (error) {
    console.error('apiMarkSupportReadByAdmin error:', error);
  }
}

export async function apiDeleteSupportTicket(ticketId: string): Promise<boolean> {
  try {
    const docRef = doc(firestoreClient, 'supports', ticketId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('apiDeleteSupportTicket error:', error);
    throw error;
  }
}

export function streamTicketsForUser(
  userId: string,
  email: string | undefined,
  callback: (supports: SupportModel[]) => void
): Unsubscribe {
  const colRef = collection(firestoreClient, 'supports');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const all = snapshot.docs.map((docSnap) =>
        SupportModel.fromJson({ ...docSnap.data(), id: docSnap.id })
      );
      const filtered = all.filter((ticket) => {
        const uMatch = Boolean(userId && ticket.userId === userId);
        const eMatch = Boolean(email && ticket.email && ticket.email.toLowerCase() === email.toLowerCase());
        return uMatch || eMatch;
      });
      filtered.sort((a, b) => {
        const aTime = a.timestampCreated ? new Date(a.timestampCreated).getTime() : 0;
        const bTime = b.timestampCreated ? new Date(b.timestampCreated).getTime() : 0;
        return bTime - aTime;
      });
      callback(filtered);
    },
    (err) => {
      console.error('streamTicketsForUser error:', err);
    }
  );
}

export async function apiCreateAdminTicketForUser(params: {
  userId: string;
  email: string;
  name?: string;
  subject: string;
  category?: string;
  message: string;
  adminName?: string;
}): Promise<string> {
  try {
    const colRef = collection(firestoreClient, 'supports');
    const now = serverTimestamp();
    const docRef = await addDoc(colRef, {
      userId: params.userId,
      email: params.email,
      name: params.name || '',
      subject: params.subject,
      category: params.category || 'General Inquiry',
      message: params.message,
      status: 'in_progress',
      lastMessage: params.message,
      lastSender: 'admin',
      adminUnread: false,
      userUnread: true,
      timestampCreated: now,
      timestampUpdated: now
    });

    const messagesRef = collection(firestoreClient, 'supports', docRef.id, 'messages');
    await addDoc(messagesRef, {
      senderId: authClient.currentUser?.uid || 'admin',
      senderRole: 'admin',
      senderName: params.adminName || 'Admin Desk',
      text: params.message,
      read: false,
      timestamp: now
    });

    return docRef.id;
  } catch (error) {
    console.error('apiCreateAdminTicketForUser error:', error);
    throw error;
  }
}

