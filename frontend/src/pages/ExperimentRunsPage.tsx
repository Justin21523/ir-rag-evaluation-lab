import { useTranslation } from 'react-i18next';
import { ConfigViewer } from '../components/common/ConfigViewer';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useExperiments } from '../hooks/useExperiments';

export function ExperimentRunsPage() {
  const { t } = useTranslation();
  const experiments = useExperiments();
  if (experiments.isLoading) return <LoadingState />;
  if (experiments.isError) return <ErrorState />;
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.experimentRuns')}</h2>
      <div className="grid gap-3">
        {(experiments.data ?? []).map((experiment) => (
          <section key={experiment.experiment_id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold">{experiment.name}</h3>
              <span className="text-sm text-slate-500">{t('common.status')}: {experiment.status}</span>
            </div>
            <ConfigViewer value={experiment.config_json ? JSON.parse(experiment.config_json) : {}} />
          </section>
        ))}
      </div>
    </div>
  );
}
