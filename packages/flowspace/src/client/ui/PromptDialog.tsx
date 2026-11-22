import { useId, useState } from "react";
import { CanvasDialog } from "../CanvasDialog.tsx";
import { t } from "../i18n.ts";

export interface PromptDialogSpec {
  title: string;
  description?: string;
  initialValue: string;
  secondaryLabel?: string;
  secondaryInitial?: string;
  onSubmit: (val: string, secondary?: string) => void;
}

export function PromptDialog({
  modal,
  onClose,
}: {
  modal: PromptDialogSpec;
  onClose: () => void;
}) {
  const formId = useId();
  const [val, setVal] = useState(modal.initialValue);
  const [sec, setSec] = useState(modal.secondaryInitial ?? "");

  return (
    <CanvasDialog
      onClose={onClose}
      title={modal.title}
      description={modal.description}
      closeLabel={t("close")}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            <span>{t("cancel")}</span>
          </button>
          <button
            type="submit"
            form={formId}
            className="button button-primary"
            disabled={!val.trim()}
          >
            <span>{t("save")}</span>
          </button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!val.trim()) return;
          modal.onSubmit(val.trim(), sec.trim());
          onClose();
        }}
      >
        <label className="field-label">{t("name")}</label>
        <input
          className="text-field"
          autoFocus
          required
          value={val}
          onChange={(ev) => setVal(ev.target.value)}
        />
        {modal.secondaryLabel && (
          <>
            <label className="field-label" style={{ marginTop: 12 }}>
              {modal.secondaryLabel}
            </label>
            <textarea
              className="text-field"
              rows={3}
              value={sec}
              onChange={(ev) => setSec(ev.target.value)}
            />
          </>
        )}
      </form>
    </CanvasDialog>
  );
}
