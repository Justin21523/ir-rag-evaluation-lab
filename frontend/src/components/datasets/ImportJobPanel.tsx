import { RotateCcw, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProgressBar } from '../common/ProgressBar';
import { StatusPill } from '../common/StatusPill';
import { useCancelJob, useJobLogs, useJobs, useRetryJob } from '../../hooks/useJobs';
import { useState } from 'react';

export function ImportJobPanel() {
  const { t } = useTranslation();
  const jobs = useJobs();
  const cancelJob = useCancelJob();
  const retryJob = useRetryJob();
  const [selectedJob, setSelectedJob] = useState<string | undefined>();
  const logs = useJobLogs(selectedJob);
  const rows = (jobs.data ?? []).filter((job) => job.job_type === 'dataset_import' || job.job_type === 'experiment_batch').slice(0, 8);
  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold">{t('jobs.title')}</h3>
      <div className="mt-3 grid gap-3">
        {rows.map((job) => (
          <button key={job.job_id} type="button" onClick={() => setSelectedJob(job.job_id)} className="rounded border p-3 text-left hover:bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">{job.job_id}</span>
              <StatusPill value={job.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{job.job_type}</span>
              <span>{job.phase}</span>
            </div>
            <div className="mt-2"><ProgressBar value={job.progress_pct} /></div>
            <div className="mt-2 flex gap-2">
              <button type="button" className="rounded border px-2 py-1 text-xs" onClick={(event) => { event.stopPropagation(); cancelJob.mutate(job.job_id); }}><Square size={12} /> {t('jobs.cancel')}</button>
              <button type="button" className="rounded border px-2 py-1 text-xs" onClick={(event) => { event.stopPropagation(); retryJob.mutate(job.job_id); }}><RotateCcw size={12} /> {t('jobs.retry')}</button>
            </div>
          </button>
        ))}
      </div>
      {selectedJob && (
        <div className="mt-4 rounded bg-slate-950 p-3 text-xs text-slate-100">
          {(logs.data ?? []).slice(-8).map((log) => <div key={log.log_id}>[{log.phase}] {log.message}</div>)}
        </div>
      )}
    </section>
  );
}
