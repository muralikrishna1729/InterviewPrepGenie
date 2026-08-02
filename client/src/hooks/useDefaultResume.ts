import { useEffect, useState } from 'react';
import { resumeService } from '../services/resume';

/**
 * Loads the user's saved default resume filename (set in Settings) so pages
 * can pre-select it and offer a "change" option without a re-upload.
 */
export function useDefaultResume() {
  const [defaultName, setDefaultName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    resumeService.getDefault()
      .then((res) => { if (mounted) setDefaultName(res.filename); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return { defaultName, loading };
}
