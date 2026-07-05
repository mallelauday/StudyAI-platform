import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Pre-select a document when navigating with ?doc=<document_id>.
 */
export function useDocFromQuery(setSelectedDocId, documents) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (!docId || !documents?.length) return;

    const exists = documents.some(
      (d) => (d.document_id || d.id) === docId
    );
    if (exists) {
      setSelectedDocId(docId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, documents, setSelectedDocId, setSearchParams]);
}
