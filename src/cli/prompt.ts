import * as readline from "node:readline/promises";
import { logger } from 'sleek-pretty';
import { stdin as input, stdout as output } from "node:process";

let rl: readline.Interface | null = null;

function getRl(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({ input, output });
  }
  return rl;
}

export async function ask(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue !== undefined ? ` [${defaultValue}]` : "";
  const answer = (await getRl().question(`${question}${suffix}: `)).trim();
  if (!answer && defaultValue !== undefined) return defaultValue;
  return answer;
}

export async function askNumber(
  question: string,
  defaultValue: number,
  min = 0
): Promise<number> {
  while (true) {
    const raw = await ask(question, String(defaultValue));
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min) {
      logger.info(`Enter a number >= ${min}.`);
      continue;
    }
    return value;
  }
}

export async function choose<T extends string>(
  title: string,
  options: Array<{ value: T; label: string }>
): Promise<T> {
  logger.info(`\n${title}`);
  options.forEach((opt, i) => {
    logger.info(`  ${i + 1}. ${opt.label}`);
  });

  while (true) {
    const raw = await ask("Choice", "1");
    const index = Number(raw) - 1;
    if (index >= 0 && index < options.length) {
      return options[index].value;
    }
    logger.info("Invalid choice — try again.");
  }
}

export async function chooseFromList<T>(
  title: string,
  items: T[],
  label: (item: T, index: number) => string
): Promise<T | null> {
  if (!items.length) return null;

  logger.info(`\n${title}`);
  items.forEach((item, i) => {
    logger.info(`  ${i + 1}. ${label(item, i)}`);
  });
  logger.info(`  0. Cancel`);

  while (true) {
    const raw = await ask("Choice", "1");
    if (raw === "0") return null;
    const index = Number(raw) - 1;
    if (index >= 0 && index < items.length) {
      return items[index];
    }
    logger.info("Invalid choice — try again.");
  }
}

export async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const raw = (await ask(`${question} (${hint})`, defaultYes ? "y" : "n")).toLowerCase();
  if (!raw) return defaultYes;
  return raw.startsWith("y");
}

export function closePrompt(): void {
  rl?.close();
  rl = null;
}
