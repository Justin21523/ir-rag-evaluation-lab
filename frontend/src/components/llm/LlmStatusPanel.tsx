import { Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLlmStatus } from '../../hooks/useLlm';

export function LlmStatusPanel() {
  const { t } = useTranslation();
  const status = useLlmStatus();
  const data = status.data;
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><Cpu size={17} />{t('llm.status')}</h3>
          <p className="mt-1 text-xs text-slate-500">{t('llm.assistiveNotice')}</p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-medium ${data?.connected ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>
          {data?.connected ? t('llm.connected') : t('llm.offline')}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('llm.model')}</dt><dd className="truncate font-mono">{data?.model ?? '-'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('llm.endpoint')}</dt><dd className="truncate font-mono">{data?.base_url ?? '-'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('llm.lastLatency')}</dt><dd>{data?.last_latency_ms ? `${data.last_latency_ms.toFixed(1)} ms` : '-'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('llm.tokensPerSecond')}</dt><dd>{data?.tokens_per_second ?? '-'}</dd></div>
      </dl>
    </section>
  );
}
