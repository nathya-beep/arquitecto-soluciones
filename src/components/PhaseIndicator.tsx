import { Phase, PHASE_LABELS } from "@/lib/types";

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

const phases: Phase[] = ["exploration", "structuring", "generation", "done"];

export default function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {phases.slice(0, 3).map((phase, index) => {
        const isDone = currentIndex > index;
        const isActive = currentPhase === phase || (currentPhase === "done" && index === 2);

        return (
          <div key={phase} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isDone
                  ? "bg-green-100 text-green-700"
                  : isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isDone ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
              <span className="hidden sm:inline">
                {phase === "exploration" && "Exploración"}
                {phase === "structuring" && "Estructuración"}
                {phase === "generation" && "Generación"}
              </span>
            </div>
            {index < 2 && (
              <div className={`h-px w-4 ${currentIndex > index ? "bg-green-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
      {currentPhase === "done" && (
        <span className="ml-2 text-xs text-green-600 font-medium">Prompt Master listo</span>
      )}
    </div>
  );
}
