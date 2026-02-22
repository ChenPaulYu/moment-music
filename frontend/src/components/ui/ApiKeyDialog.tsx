import { useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import MaterialIcon from "./MaterialIcon";
import { saveApiKeys, getApiKeyStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ApiKeyDialogProps {
  missingKeys: string[];
  onSaved: () => void;
  onClose: () => void;
}

const KEY_LABELS: Record<string, string> = {
  openai: "OpenAI",
  stability: "Stability AI",
};

const KEY_FIELDS: Record<string, string> = {
  openai: "openai_api_key",
  stability: "stability_api_key",
};

export default function ApiKeyDialog({
  missingKeys,
  onSaved,
  onClose,
}: ApiKeyDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      for (const key of missingKeys) {
        const field = KEY_FIELDS[key];
        const val = values[key]?.trim();
        if (field && val) payload[field] = val;
      }
      if (Object.keys(payload).length === 0) {
        setError("Please enter the required API key(s).");
        setSaving(false);
        return;
      }
      await saveApiKeys(payload);
      // Verify the keys were actually saved
      const status = await getApiKeyStatus();
      const stillMissing = missingKeys.filter(
        (k) => !status[k as keyof typeof status]
      );
      if (stillMissing.length > 0) {
        setError("Keys saved but some are still missing. Please check them.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Failed to save keys. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative glass-panel rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl shadow-black/40 animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          <MaterialIcon icon="close" size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <MaterialIcon icon="key" size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">API Keys Required</h3>
            <p className="text-[#9b92c9] text-xs">
              Enter your keys to start generating
            </p>
          </div>
        </div>

        {/* Missing keys */}
        <div className="flex flex-col gap-3 mb-4">
          {missingKeys.map((key) => (
            <div key={key}>
              <label className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-medium text-white/70">
                  {KEY_LABELS[key] ?? key}
                </span>
              </label>
              <input
                type="password"
                placeholder={`Enter ${KEY_LABELS[key] ?? key} API key`}
                value={values[key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/setup"
            className="text-xs text-[#9b92c9] hover:text-white transition-colors"
          >
            Go to Setup
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              "bg-primary/20 text-white border border-primary/40 hover:bg-primary/30",
              saving && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
