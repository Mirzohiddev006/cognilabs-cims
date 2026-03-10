// services/userServices.ts
import api from "@/lib/api";

import { CreateUserPayload } from "@/lib/types";

export interface UpdateUserPayload extends Partial<CreateUserPayload> {}

export const addUser = async (payload: CreateUserPayload) => {
  const res = await api.post("/ceo/users", payload);
  return res.data;
};

export const updateUser = async (
  id: number | string,
  payload: UpdateUserPayload,
) => {
  const res = await api.put(`/ceo/users/${id}`, payload);
  return res.data;
};

export const deleteUser = async (id: number | string) => {
  const res = await api.delete(`/ceo/users/${id}`);
  return res.data;
};
