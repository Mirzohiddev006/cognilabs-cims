import {
  addClient,
  deleteClient,
  updateClient,
  type Client,
} from "@/services/clientServices";

export interface CreateSalePayload {
  full_name: string;
  platform: string;
  username: string;
  phone_number: string;
  status: string;
  assistant_name: string;
  notes: string;
  conversation_language?: string | null;
  recall_time?: string | null;
  customer_type?: string | null;
}

export interface UpdateSalePayload extends Partial<CreateSalePayload> {}

export const addSale = async (payload: CreateSalePayload) => {
  return addClient({
    full_name: payload.full_name,
    username: payload.username,
    platform: payload.platform,
    phone_number: payload.phone_number,
    status: payload.status,
    assistant_name: payload.assistant_name,
    notes: payload.notes,
    recall_time: payload.recall_time ?? null,
    customer_type: payload.customer_type ?? null,
    conversation_language: payload.conversation_language ?? "uz",
    audio: null,
    audio_file_id: null,
    audio_url: null,
  });
};

export const updateSale = async (
  id: number | string,
  payload: UpdateSalePayload,
): Promise<Client> => {
  return updateClient(id, {
    ...payload,
    status: payload.status,
  });
};

export const deleteSale = async (id: number | string) => {
  await deleteClient(id);
  return { success: true };
};
