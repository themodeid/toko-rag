"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Branch } from "@/features/branches/types";
import { getBranches } from "@/features/branches/api";
import { useAuth } from "./AuthContext";

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  currentBranch: Branch | null;
  refreshBranches: () => Promise<void>;
  loading: boolean;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  selectedBranchId: "all",
  setSelectedBranchId: () => {},
  currentBranch: null,
  refreshBranches: async () => {},
  loading: true,
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userRole = (user?.role || "").toLowerCase();
  const userBranchId = (user as any)?.branch_id;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const data = await getBranches();
      setBranches(data);

      // Inisialisasi selectedBranchId berdasarkan role
      if (["manager", "karyawan"].includes(userRole) && userBranchId) {
        setSelectedBranchIdState(userBranchId);
      } else {
        const saved = typeof window !== "undefined" ? localStorage.getItem("selected_branch_id") : null;
        if (saved && (saved === "all" || data.some((b) => b.id === saved))) {
          setSelectedBranchIdState(saved);
        } else if (data.length > 0) {
          setSelectedBranchIdState("all");
        }
      }
    } catch (err) {
      console.error("Failed to load branches in context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [userRole, userBranchId]);

  const setSelectedBranchId = (id: string) => {
    setSelectedBranchIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_branch_id", id);
    }
  };

  const currentBranch =
    selectedBranchId === "all"
      ? null
      : branches.find((b) => b.id === selectedBranchId) || null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        setSelectedBranchId,
        currentBranch,
        refreshBranches: fetchBranches,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
