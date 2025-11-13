import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  createLogger,
  format as _format,
  transports as _transports,
} from "winston";

const isProduction = process.env.NODE_ENV === "production";

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
  level: "info",
  format: _format.combine(
    _format.timestamp(),
    _format.errors({ stack: true }),
    _format.json()
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
            })
          ),
        }),
      ],
});

export default logger;
