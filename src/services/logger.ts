import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  createLogger,
  format as _format,
  transports as _transports,
  addColors,
  type Logger,
  type LeveledLogMethod,
} from "winston";

const isProduction = process.env.NODE_ENV === "production";

// Custom severity ladder: `fatal` sits above `error` for unrecoverable
// failures (5xx, deprecated route hits) that must stand out from ordinary errors.
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5,
} as const;

addColors({
  fatal: "magenta bold",
  error: "red",
  warn: "yellow",
  info: "green",
  http: "cyan",
  debug: "gray",
});

type CustomLevel = keyof typeof levels;
type AppLogger = Logger & Record<CustomLevel, LeveledLogMethod>;

// Ensure logs directory exists in production
const logsDir = join(process.cwd(), "logs");
if (isProduction) {
  try {
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
  } catch (e) {
    // Fall back silently; Winston will throw if it cannot write
  }
}

const logger = createLogger({
  levels,
  level: "debug",
  format: _format.combine(
    _format.timestamp(),
    _format.errors({ stack: true }),
    _format.json(),
  ),
  transports: isProduction
    ? [
        new _transports.File({
          filename: join(logsDir, "error.log"),
          level: "error",
          maxsize: 5 * 1024 * 1024,
          maxFiles: 5,
        }),
        new _transports.File({
          filename: join(logsDir, "combined.log"),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
        new _transports.Console({
          level: "debug",
          format: _format.combine(
            _format.colorize(),
            _format.timestamp(),
            _format.printf(({ level, message, timestamp, stack, ...meta }) => {
              const base = `${timestamp} ${level}: ${message}`;
              const details = stack ? `\n${stack}` : "";
              const metaStr = Object.keys(meta).length
                ? `\n${JSON.stringify(meta)}`
                : "";
              return base + details + metaStr;
            }),
          ),
        }),
      ]
    : [
        new _transports.Console({
          level: "debug",
          format: _format.combine(
            _format.colorize(),
            _format.timestamp(),
            _format.printf(({ level, message, timestamp, stack, ...meta }) => {
              const base = `${timestamp} ${level}: ${message}`;
              const details = stack ? `\n${stack}` : "";
              const metaStr = Object.keys(meta).length
                ? `\n${JSON.stringify(meta)}`
                : "";
              return base + details + metaStr;
            }),
          ),
        }),
      ],
});

export default logger as AppLogger;
