import { useState } from "react";
import { Pencil } from "lucide-react";
import { filenameStem, validateFilename } from "../features/export/filename";

export function EditableFilename({ name, disabled, onSave }: {
  name: string;
  disabled: boolean;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  function save() {
    try {
      onSave(validateFilename(draft));
      setEditing(false);
      setError("");
    } catch (e) { setError((e as Error).message); }
  }
  return <div className="filename-editor">
    {editing ? <div className="filename-input">
      <input autoFocus aria-label="Export filename" aria-invalid={!!error}
        aria-describedby={error ? "filename-error" : undefined}
        value={draft} maxLength={240}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => { setDraft(e.target.value); setError(""); }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") {
            e.preventDefault(); e.stopPropagation(); setEditing(false); setError("");
          }
        }} />
      <span>.pdf</span>
    </div> : <button className="filename-button" title="Edit export filename"
      aria-label={`Edit export filename: ${name}`} disabled={disabled}
      onClick={() => { setDraft(filenameStem(name)); setEditing(true); }}>
      <span title={name}>{name}</span><Pencil size={15} />
    </button>}
    {error && <span className="filename-error" id="filename-error" role="alert">{error}</span>}
  </div>;
}
