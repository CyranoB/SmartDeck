import fs from 'fs/promises';
import path from 'path';

export type PromptOperation = 'analyze' | 'flashcard' | 'mcq';

/**
 * Loads a prompt template file for the given operation.
 * @param operation - The prompt type ('analyze', 'flashcard', 'mcq')
 */
export async function loadPromptTemplate(
  operation: PromptOperation
): Promise<string> {
  const filePath = path.join(process.cwd(), 'lib/ai/prompts', `${operation}.txt`);
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Interpolates variables into a prompt template using {{variable}} syntax.
 * @param template - The prompt template string
 * @param variables - An object with keys matching the placeholder names
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/{{(\w+)}}/g, (_, key) => variables[key] ?? '');
}
