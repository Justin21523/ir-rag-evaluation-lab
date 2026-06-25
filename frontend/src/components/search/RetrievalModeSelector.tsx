import { useTranslation } from 'react-i18next';
import type { RetrievalMode } from '../../api/types';

const modes: RetrievalMode[] = ['bm25', 'dense', 'hybrid', 'rerank'];

export function RetrievalModeSelector({ value, onChange }: { value: RetrievalMode; onChange: (mode: RetrievalMode) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded border px-3 py-2 text-sm ${value === mode ? 'border-teal-700 bg-teal-50 text-teal-900' : 'bg-white'}`}
        >
          {t(`retrieval.${mode}`)}
        </button>
      ))}
    </div>
  );
}
