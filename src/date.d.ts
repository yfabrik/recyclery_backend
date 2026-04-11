type oneToNine = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type d = oneToNine | 0;
type YYYY = `19${d}${d}` | `20${d}${d}`;
type MM = `0${oneToNine}` | `1${0 | 1 | 2}`;
type DD = `${0}${oneToNine}` | `${1 | 2}${d}` | `3${0 | 1}`;
type DateYMString = `${YYYY}-${MM}`;
type THours = `${number}${number}`;
type TMinutes = `${number}${number}`;
type TSeconds = `${number}${number}`;
type TMilliseconds = `${number}${number}${number}`;

// type: DateYMD ex. "2021-01-01"
export type DateYMD = `${DateYMString}-${DD}`;

/**
 * type: TDateISOTime ex. "14:42:34.678"
 */
type TDateISOTime = `${THours}:${TMinutes}:${TSeconds}.${TMilliseconds}`;

/**
 * type: DateYMDZoneString ex. "2021-01-01T14:42:34.678Z"
 */
export type ISO8601 = `${DateYMD}T${TDateISOTime}Z`;
