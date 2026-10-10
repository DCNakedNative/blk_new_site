import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api, { getErrorMessage } from '../lib/api';

/**
 * Loads data from the API and keeps loading / error / retry in one place.
 * - Old requests are cancelled when the inputs change, so a slow response can't
 *   overwrite a newer one.
 * - A failed request is reported as an error instead of looking like "no results".
 */
export default function useFetch(url, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [attempt, setAttempt] = useState(0);
  const paramsKey = JSON.stringify(params || {});

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    api
      .get(url, { params: JSON.parse(paramsKey), signal: controller.signal })
      .then((res) => setState({ data: res.data, loading: false, error: null }))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setState({ data: null, loading: false, error: getErrorMessage(err, 'Could not load this page.') });
      });

    return () => controller.abort();
  }, [url, paramsKey, enabled, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
