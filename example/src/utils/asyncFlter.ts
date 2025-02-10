export type FilterFn<T> = (rootValue?: T) => boolean | Promise<boolean>;

export const asyncFilter = <T>(
  asyncIterator: AsyncIterator<T>,
  filterFn: FilterFn<T>,
): AsyncIterableIterator<T> => {
  const getNextPromise = (): Promise<IteratorResult<T>> =>
    asyncIterator.next().then((payload) => {
      if (payload.done) {
        return payload;
      }

      return Promise.resolve(filterFn(payload.value))
        .catch(() => false)
        .then((filterResult) => {
          if (filterResult) {
            return payload;
          }

          // Skip the current value and wait for the next one
          return getNextPromise();
        });
    });

  return {
    next() {
      return getNextPromise();
    },
    return() {
      return asyncIterator.return
        ? asyncIterator.return()
        : Promise.resolve({ done: true, value: undefined });
    },
    throw(error) {
      return asyncIterator.throw
        ? asyncIterator.throw(error)
        : Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};
