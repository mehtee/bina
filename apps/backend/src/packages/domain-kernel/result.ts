export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(res: Result<T, E>): res is { readonly ok: true; readonly value: T } => res.ok;

export const isErr = <T, E>(res: Result<T, E>): res is { readonly ok: false; readonly error: E } => !res.ok;

export function map<T, U, E>(res: Result<T, E>, fn: (val: T) => U): Result<U, E> {
  return res.ok ? ok(fn(res.value)) : res;
}

export function flatMap<T, U, E>(res: Result<T, E>, fn: (val: T) => Result<U, E>): Result<U, E> {
  return res.ok ? fn(res.value) : res;
}
