import { useTranslation } from 'react-i18next';
import type { RagClaim } from '../../api/types';

export function ClaimSupportPanel({ claims }: { claims: RagClaim[] }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold">{t('rag.claims')}</h3>
      <div className="mt-3 grid gap-2">
        {claims.map((claim) => (
          <article key={claim.claim_id} className={`rounded border p-3 text-sm ${claim.supported ? 'border-teal-200 bg-teal-50' : 'border-amber-300 bg-amber-50'}`}>
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{claim.claim_id}</strong>
              <span>{claim.supported ? t('rag.supported') : t('rag.unsupported')}</span>
            </div>
            <p className="mt-2">{claim.text}</p>
            {!claim.supported && <p className="mt-2 text-xs text-amber-900">{claim.unsupported_reason}</p>}
            <p className="mt-2 text-xs text-slate-600">{t('rag.citations')}: {claim.cited_doc_ids.join(', ') || '-'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
