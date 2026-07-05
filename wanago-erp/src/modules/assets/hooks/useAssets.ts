"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAssets, createAsset, updateAsset, deleteAsset } from "@/modules/assets/services/asset.service";
import {
  fetchAssetRequests, approveAssetRequest, rejectAssetRequest,
} from "@/modules/assets/services/asset-request.service";
import { useAuthStore } from "@/store/auth.store";
import type { Asset, AssetRequest } from "@/modules/assets/types";
import type { AssetSchema } from "@/modules/assets/schemas";

export function useAssets() {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([fetchAssets(), fetchAssetRequests()]);
      setAssets(a);
      setRequests(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addAsset(data: AssetSchema) {
    try {
      const a = await createAsset(data, user?.uid ?? "");
      setAssets((p) => [a, ...p]);
      return { error: null };
    } catch { return { error: "Failed to add asset" }; }
  }

  async function editAsset(id: string, data: Partial<AssetSchema>) {
    try {
      await updateAsset(id, data);
      await load();
      return { error: null };
    } catch { return { error: "Failed to update asset" }; }
  }

  async function removeAsset(id: string) {
    try {
      await deleteAsset(id);
      setAssets((p) => p.filter((a) => a.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete asset" }; }
  }

  async function decideRequest(id: string, decision: "approve" | "reject") {
    try {
      if (decision === "approve") await approveAssetRequest(id, user?.uid ?? "");
      else await rejectAssetRequest(id, user?.uid ?? "");
      await load();
      return { error: null };
    } catch { return { error: "Failed to record decision" }; }
  }

  const pendingRequests = requests.filter((r) => r.requestStatus === "pending");

  return { assets, requests, pendingRequests, loading, load, addAsset, editAsset, removeAsset, decideRequest };
}
