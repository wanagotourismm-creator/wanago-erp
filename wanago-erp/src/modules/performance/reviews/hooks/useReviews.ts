"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchReviews, createReview, updateReview, acknowledgeReview, deleteReview,
} from "@/modules/performance/reviews/services/review.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { RATING_LABELS } from "@/lib/constants";
import type { PerformanceReview, PerformanceReviewFormData } from "@/modules/performance/reviews/types";

export function useReviews() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReviews();
      setReviews(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addReview(data: PerformanceReviewFormData): Promise<{ error: string | null }> {
    try {
      const review = await createReview(data, user?.uid ?? "");
      setReviews(prev => [review, ...prev]);
      logActivity({
        entityType: "Performance Review", entityName: review.employeeName, action: "created",
        detail: `${review.refNumber}: ${review.employeeName} rated ${RATING_LABELS[review.rating]} (${review.period})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create review" };
    }
  }

  async function editReview(
    id: string, data: Partial<PerformanceReviewFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateReview(id, data);
      setReviews(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      return { error: null };
    } catch {
      return { error: "Failed to update review" };
    }
  }

  async function acknowledge(id: string): Promise<void> {
    await acknowledgeReview(id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "acknowledged" } : r));
  }

  async function removeReview(id: string): Promise<{ error: string | null }> {
    try {
      const review = reviews.find(r => r.id === id);
      await deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      if (review) {
        logActivity({
          entityType: "Performance Review", entityName: review.employeeName, action: "deleted",
          detail: `Deleted review ${review.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete review" };
    }
  }

  return { reviews, loading, load, addReview, editReview, acknowledge, removeReview };
}
