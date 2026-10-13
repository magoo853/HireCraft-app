"use client";

import { useState } from "react";
import { inputCls } from "./ui";

/**
 * The roadmap form's goal-idea chips: a labeled quick-pick row plus an
 * edit mode. In view mode, tapping a chip fills the checkpoint's goal
 * box (unchanged behavior). In edit mode each chip becomes a text field
 * with a remove control, and the user can add their own ideas or Reset
 * back to the computed set. The idea set is shared across checkpoint
 * cards — it is the user's own quick list, applied to whichever
 * checkpoint they are filling in.
 */
interface GoalIdeasProps {
  ideas: string[];
  /** Honest source label: personalized / stock examples / user's own. */
  label: string;
  editing: boolean;
  onToggleEdit: () => void;
  onPick: (idea: string) => void;
  onChange: (ideas: string[]) => void;
  onReset: () => void;
}

export function GoalIdeas({
  ideas,
  label,
  editing,
  onToggleEdit,
  onPick,
  onChange,
  onReset,
}: GoalIdeasProps) {
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...ideas, text]);
    setDraft("");
  };

  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[11px] font-semibold text-muted">{label}</p>
        <div className="flex items-center shrink-0">
          {editing && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] font-semibold text-muted underline underline-offset-2 min-h-[44px] inline-flex items-center px-2"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onToggleEdit}
            aria-expanded={editing}
            className="text-[11px] font-bold text-pine underline underline-offset-2 min-h-[44px] inline-flex items-center px-2"
          >
            {editing ? "Done" : "Edit ideas"}
          </button>
        </div>
      </div>

      {!editing ? (
        ideas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {ideas.map((idea, idx) => (
              <button
                key={`${idx}-${idea}`}
                type="button"
                onClick={() => onPick(idea)}
                className="text-[11px] font-semibold text-pine bg-mint border border-brand/30 rounded-full px-2.5 py-1.5 min-h-[44px] inline-flex items-center"
              >
                {idea}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted">No ideas yet — tap “Edit ideas” to add your own.</p>
        )
      ) : (
        <div>
          {ideas.map((idea, idx) => (
            <div key={idx} className="flex items-center gap-1.5 mb-1.5">
              <input
                value={idea}
                aria-label={`Edit idea ${idx + 1}`}
                onChange={(e) =>
                  onChange(ideas.map((x, j) => (j === idx ? e.target.value : x)))
                }
                onBlur={() => {
                  if (!idea.trim()) onChange(ideas.filter((_, j) => j !== idx));
                }}
                className={`${inputCls} !text-sm flex-1 min-h-[44px]`}
              />
              <button
                type="button"
                aria-label={`Remove idea ${idx + 1}`}
                onClick={() => onChange(ideas.filter((_, j) => j !== idx))}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-muted text-lg font-bold shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              value={draft}
              aria-label="New idea"
              placeholder="Add your own idea"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDraft();
                }
              }}
              className={`${inputCls} !text-sm flex-1 min-h-[44px]`}
            />
            <button
              type="button"
              onClick={addDraft}
              disabled={!draft.trim()}
              className="min-h-[44px] px-3 inline-flex items-center text-[12px] font-bold text-pine disabled:opacity-40 shrink-0"
            >
              ＋ Add idea
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
