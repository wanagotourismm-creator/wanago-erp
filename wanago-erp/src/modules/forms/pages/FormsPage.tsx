"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useForms } from "@/modules/forms/hooks/useForms";
import { FormsTable } from "@/modules/forms/components/FormsTable";
import { FormBuilder } from "@/modules/forms/components/FormBuilder";
import { FormResponsesModal } from "@/modules/forms/components/FormResponsesModal";
import { FormFillModal } from "@/modules/forms/components/FormFillModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import type { Form } from "@/modules/forms/types";
import type { FormSchema } from "@/modules/forms/schemas";

export function FormsPage() {
  const { forms, loading, addForm, editForm, removeForm, togglePublish, load } = useForms();
  const { user } = useAuthStore();

  const [builderOpen,    setBuilderOpen]    = useState(false);
  const [editingForm,    setEditingForm]    = useState<Form | null>(null);
  const [viewingResponsesFor, setViewingResponsesFor] = useState<Form | null>(null);
  const [fillingForm,    setFillingForm]    = useState<Form | null>(null);

  async function handleSubmit(data: FormSchema) {
    const payload = {
      ...data,
      description: data.description || null,
      fields: data.fields.map(f => ({ ...f, placeholder: f.placeholder || null })),
      createdBy:   user?.uid ?? "",
    };

    if (editingForm) {
      await editForm(editingForm.id, payload);
    } else {
      await addForm(payload as never);
    }
    setBuilderOpen(false);
    setEditingForm(null);
  }

  function handleEdit(form: Form) {
    setEditingForm(form);
    setBuilderOpen(true);
  }

  async function handleDelete(form: Form) {
    if (!confirm(`Delete form "${form.title}"? This cannot be undone, and any collected responses will remain orphaned.`)) return;
    await removeForm(form.id);
  }

  function handleCopyLink(form: Form) {
    if (!form.shareToken) return;
    const link = `${window.location.origin}/f/${form.shareToken}`;
    navigator.clipboard.writeText(link).catch(() => {});
    alert(`Link copied:\n${link}`);
  }

  function handleFill(form: Form) {
    if (form.visibility === "public") {
      handleCopyLink(form);
      return;
    }
    setFillingForm(form);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Forms"
        description={`${forms.length} total form${forms.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingForm(null); setBuilderOpen(true); }}>
              New Form
            </Button>
          </>
        }
      />

      <FormsTable
        forms={forms}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePublish={(form) => togglePublish(form)}
        onViewResponses={setViewingResponsesFor}
        onFill={handleFill}
        onCopyLink={handleCopyLink}
      />

      <FormBuilder
        open={builderOpen}
        form={editingForm}
        onClose={() => { setBuilderOpen(false); setEditingForm(null); }}
        onSubmit={handleSubmit}
      />

      <FormResponsesModal form={viewingResponsesFor} onClose={() => setViewingResponsesFor(null)} />
      <FormFillModal form={fillingForm} onClose={() => setFillingForm(null)} />

    </div>
  );
}
