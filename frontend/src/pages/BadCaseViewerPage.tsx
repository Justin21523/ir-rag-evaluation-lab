import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { irApi } from '../api/irApi';
import { BadCaseTable } from '../components/badcases/BadCaseTable';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useMemo, useState } from 'react';

export function BadCaseViewerPage() {
  const { t } = useTranslation();
  const [caseType, setCaseType] = useState('');
  const cases = useQuery({ queryKey: ['bad-cases'], queryFn: irApi.badCases });
  const filtered = useMemo(() => (cases.data ?? []).filter((item) => !caseType || item.case_type === caseType), [cases.data, caseType]);
  const caseTypes = Array.from(new Set((cases.data ?? []).map((item) => item.case_type)));
  if (cases.isLoading) return <LoadingState />;
  if (cases.isError) return <ErrorState />;
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.badCases')}</h2>
      <div className="flex flex-wrap gap-2 rounded-lg border bg-white p-4">
        <select className="rounded border px-2 py-1 text-sm" value={caseType} onChange={(event) => setCaseType(event.target.value)}>
          <option value="">{t('common.type')}</option>
          {caseTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <a className="rounded border bg-white px-3 py-2 text-sm" href={irApi.badCasesCsvUrl()}>{t('common.exportCsv')}</a>
      </div>
      <BadCaseTable cases={filtered} />
    </div>
  );
}
