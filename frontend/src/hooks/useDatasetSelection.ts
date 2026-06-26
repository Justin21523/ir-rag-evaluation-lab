import { useEffect, useState } from 'react';

const KEY = 'ir-rag-dataset-id';
const DEFAULT_DATASET_ID = 'sample_ir_demo_100';

export function getSelectedDataset() {
  return localStorage.getItem(KEY) || DEFAULT_DATASET_ID;
}

export function setSelectedDataset(datasetId: string) {
  localStorage.setItem(KEY, datasetId);
  window.dispatchEvent(new CustomEvent('dataset-changed', { detail: datasetId }));
}

export function useDatasetSelection() {
  const [datasetId, setDatasetIdState] = useState(getSelectedDataset);
  useEffect(() => {
    const listener = () => setDatasetIdState(getSelectedDataset());
    window.addEventListener('dataset-changed', listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener('dataset-changed', listener);
      window.removeEventListener('storage', listener);
    };
  }, []);
  const setDatasetId = (value: string) => {
    setSelectedDataset(value);
    setDatasetIdState(value);
  };
  return { datasetId, setDatasetId };
}
