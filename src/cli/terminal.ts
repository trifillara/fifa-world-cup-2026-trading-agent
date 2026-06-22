import { logger } from "./logger";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const BOLD = "\x1b[1m";

function clock(): string {
  return new Date().toISOString().slice(11, 19);
}

function line(level: string, color: string, topic: string, message: string): string {
  const topicPart = topic ? `${DIM}${topic.padEnd(12)}${RESET} ` : "";
  return `${DIM}${clock()}${RESET} ${color}${level.padEnd(5)}${RESET} ${topicPart}${message}`;
}

export const pulse = {
  raw(text: string): void {
    logger.info(text);
  },

  banner(text: string): void {
    logger.info(text);
  },

  info(topic: string, message: string): void {
    logger.info(line("INFO", CYAN, topic, message));
  },

  ok(topic: string, message: string): void {
    logger.info(line(" OK ", GREEN, topic, message));
  },

  warn(topic: string, message: string): void {
    logger.info(line("WARN", YELLOW, topic, message));
  },

  err(topic: string, message: string): void {
    logger.error(line(" ERR ", RED, topic, message));
  },

  trade(message: string): void {
    logger.info(line("EXEC", MAGENTA, "order", message));
  },

  title(text: string): void {
    logger.info(`\n${BOLD}${text}${RESET}`);
  },

  dim(text: string): void {
    logger.info(`${DIM}${text}${RESET}`);
  },
};
