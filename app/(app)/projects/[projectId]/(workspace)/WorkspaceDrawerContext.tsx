"use client";

import { createContext, useContext } from "react";

type WorkspaceDrawerValue = {
  closeSidebar: () => void;
  closeChat: () => void;
};

const WorkspaceDrawerContext = createContext<WorkspaceDrawerValue>({
  closeSidebar: () => {},
  closeChat: () => {},
});

export const WorkspaceDrawerProvider = WorkspaceDrawerContext.Provider;

export function useWorkspaceDrawer() {
  return useContext(WorkspaceDrawerContext);
}
