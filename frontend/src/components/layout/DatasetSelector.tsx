import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDatasets } from '../../hooks/useCorpus';
import { useDatasetSelection } from '../../hooks/useDatasetSelection';

export function DatasetSelector() {
  const { t } = useTranslation();
  const datasets = useDatasets();
  const { datasetId, setDatasetId } = useDatasetSelection();
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <Database size={18} aria-hidden />
      <span className="sr-only">{t('datasets.selector')}</span>
      <select
        aria-label={t('datasets.selector')}
        value={datasetId}
        onChange={(event) => setDatasetId(event.target.value)}
        className="max-w-64 rounded border bg-white px-2 py-1"
      >
        {(datasets.data ?? [{ dataset_id: 'sample_default', name: 'Sample Default' }]).map((dataset) => (
          <option key={dataset.dataset_id} value={dataset.dataset_id}>
            {dataset.name}
          </option>
        ))}
      </select>
    </label>
  );
}
