// Coalesce identical jobs while giving queued callers an actual deadline.
export function createWorkQueue({ limit = 3, waitMs = 2000 } = {}) {
  const jobs = new Map();
  let active = false;
  function rejectQueued(job, error) {
    if (job.started) return;
    jobs.delete(job.key);
    for (const listener of job.listeners) {
      listener.cleanup();
      listener.reject(error);
    }
    job.listeners.clear();
  }
  async function drain() {
    if (active) return;
    const job = [...jobs.values()].find((item) => !item.started);
    if (!job) return;
    job.started = true;
    clearTimeout(job.timer);
    active = true;
    try {
      const result = await job.run();
      for (const listener of job.listeners) listener.resolve(result);
    } catch (error) {
      for (const listener of job.listeners) listener.reject(error);
    } finally {
      for (const listener of job.listeners) listener.cleanup();
      jobs.delete(job.key);
      active = false;
      void drain();
    }
  }
  return {
    run(key, run, signal) {
      if (signal?.aborted) return Promise.reject(Error("Search cancelled"));
      let job = jobs.get(key);
      if (!job) {
        if (jobs.size >= limit + 1) return Promise.reject(Error("Search busy"));
        job = { key, run, listeners: new Set(), started: false };
        job.timer = setTimeout(
          () => rejectQueued(job, Error("Search queue expired")),
          waitMs,
        );
        jobs.set(key, job);
      }
      return new Promise((resolve, reject) => {
        const listener = {
          resolve,
          reject,
          cleanup: () => signal?.removeEventListener("abort", abort),
        };
        const abort = () => {
          job.listeners.delete(listener);
          listener.cleanup();
          reject(Error("Search cancelled"));
          if (!job.started && !job.listeners.size) {
            clearTimeout(job.timer);
            jobs.delete(key);
          }
        };
        job.listeners.add(listener);
        signal?.addEventListener("abort", abort, { once: true });
        queueMicrotask(drain);
      });
    },
    get busy() {
      return active || jobs.size > 0;
    },
    get size() {
      return jobs.size;
    },
  };
}
