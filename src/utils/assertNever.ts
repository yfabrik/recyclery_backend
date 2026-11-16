/** Closes a `switch` over a union: fails to compile when a case is left unhandled. */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${String(value)}`);
};
