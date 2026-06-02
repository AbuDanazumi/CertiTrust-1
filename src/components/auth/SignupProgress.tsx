import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignupProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center" aria-label="Signup progress">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <li key={label} className="flex flex-1 items-center">
            {index > 0 && (
              <div className={cn("h-px flex-1", done || active ? "bg-primary" : "bg-border")} />
            )}
            <div className="flex flex-col items-center gap-1.5 px-1">
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-background text-primary shadow-soft",
                  !done && !active && "border-border bg-muted/30 text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : stepNum}
              </span>
              <span
                className={cn(
                  "hidden text-[11px] font-medium sm:block",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/50 py-3 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
