"use client";

import { createContext, useContext } from "react";

export type Role = "owner" | "admin" | "seller";
export interface Me { id: number; name: string; email: string; role: Role }

export const MeCtx = createContext<Me | null>(null);
export const useMe = () => {
  const m = useContext(MeCtx);
  if (!m) throw new Error("useMe вне админ-панели");
  return m;
};
