import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/platform";

export function useRemote<T>(
  loader: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const current = useRef(loader);
  current.current = loader;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    current
      .current()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...dependencies, revision]);
  return { data, loading, error, reload: () => setRevision((v) => v + 1) };
}
