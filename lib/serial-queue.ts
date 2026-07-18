/** Runs pushed jobs strictly one at a time, in push order — a rejection in one job
 *  never blocks the next. Used to serialize Whisper transcription calls so a slow
 *  one can't race a fast one, while still letting the caller push the next job
 *  immediately (e.g. while still recording the next utterance). */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  push<T>(job: () => Promise<T>): Promise<T> {
    const result = this.tail.then(job, job);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
