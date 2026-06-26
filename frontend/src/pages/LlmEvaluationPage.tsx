import { useTranslation } from 'react-i18next';
import { LlmEvaluationCharts } from '../components/charts/LlmEvaluationCharts';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { LlmStatusPanel } from '../components/llm/LlmStatusPanel';
import { useLlmDashboard } from '../hooks/useLlm';
import { useDatasetSelection } from '../hooks/useDatasetSelection';

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ms(value: number) {
  return `${Math.round(value)} ms`;
}

export function LlmEvaluationPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const dashboard = useLlmDashboard(datasetId);
  return (
    <div data-tour-id="llm-dashboard" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-teal-700">{t('llm.assistiveSignal')}</p>
          <h2 className="text-2xl font-semibold">{t('navigation.llmEvaluation')}</h2>
          <p className="mt-1 font-mono text-sm text-slate-500">{datasetId}</p>
        </div>
      </div>
      <LlmStatusPanel />
      {dashboard.isPending && <LoadingState />}
      {dashboard.isError && <ErrorState />}
      {dashboard.data && (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              [t('llm.totalRuns'), dashboard.data.total_runs],
              [t('llm.realRuns'), dashboard.data.real_run_count],
              [t('llm.failedRuns'), dashboard.data.failed_run_count],
              [t('llm.successRate'), pct(dashboard.data.success_rate)],
              [t('llm.invalidJsonRate'), pct(dashboard.data.invalid_json_rate)],
              [t('llm.averageLatency'), ms(dashboard.data.average_latency_ms)],
              [t('llm.averageConfidence'), pct(dashboard.data.average_confidence)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-white p-4">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
              </div>
            ))}
          </section>
          <LlmEvaluationCharts dashboard={dashboard.data} />
          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('llm.slowestPrompts')}</h3>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr><th className="py-2">{t('common.type')}</th><th>{t('metrics.latency')}</th><th>{t('common.status')}</th></tr>
                </thead>
                <tbody>
                  {dashboard.data.slowest_prompts.map((run) => (
                    <tr key={run.run_id} className="border-t">
                      <td className="py-2">{run.prompt_type}</td>
                      <td>{ms(run.latency_ms)}</td>
                      <td><span className="rounded bg-slate-100 px-2 py-1 text-xs">{run.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('llm.runHistory')}</h3>
              <div className="grid gap-2">
                {dashboard.data.recent_runs.map((run) => (
                  <details key={run.run_id} className="rounded border bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {run.prompt_type} · {run.status} · {run.latency_ms ? ms(run.latency_ms) : 'n/a'}
                    </summary>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600">
                      <p>{run.input_summary}</p>
                      <p>{run.output_summary}</p>
                      <details>
                        <summary>{t('llm.debugJson')}</summary>
                        <pre className="mt-2 max-h-60 overflow-auto rounded bg-white p-2">{JSON.stringify({ request: run.request, response: run.response, error: run.error }, null, 2)}</pre>
                      </details>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
