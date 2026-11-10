import Dexie, { type Table } from 'dexie';
import { SETUP_SCHEMA, type Setup } from './domain';

/** Exports remain portable; this store is only the current browser's working copy. */
const MAX_BYTES = 2 * 1024 * 1024;
const PROJECT_ID = 'current';

interface SavedProject {
  id: string;
  setup: unknown;
}

class ProjectDatabase extends Dexie {
  projects!: Table<SavedProject, string>;

  constructor() {
    super('branchlab');
    this.version(1).stores({ projects: 'id' });
  }
}

const database = new ProjectDatabase();

function validateSetup(value: unknown): Setup {
  const result = SETUP_SCHEMA.safeParse(value);
  if (!result.success) {
    throw new Error(
      'Ce projet est invalide ou utilise une version non prise en charge. Le projet actuel est conservé.',
    );
  }
  return result.data;
}

/** Validate first so a failed import cannot overwrite an existing working copy. */
export function parseSetup(text: string): Setup {
  // The initial character check avoids allocating another large buffer for huge input.
  if (text.length > MAX_BYTES || new TextEncoder().encode(text).byteLength > MAX_BYTES) {
    throw new Error('Ce fichier dépasse la limite de 2 Mo. Le projet actuel est conservé.');
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      'Ce fichier ne contient pas un projet JSON valide. Le projet actuel est conservé.',
    );
  }
  return validateSetup(value);
}

export function exportSetup(setup: Setup): string {
  return JSON.stringify(validateSetup(setup), null, 2);
}

export async function loadSetup(): Promise<Setup | null> {
  let project: SavedProject | undefined;
  try {
    project = await database.projects.get(PROJECT_ID);
  } catch {
    throw new Error(
      'La sauvegarde locale est inaccessible. Vous pouvez continuer et exporter votre projet.',
    );
  }
  // Keep a corrupt record intact; don't silently delete the user's data.
  return project ? validateSetup(project.setup) : null;
}

export async function saveSetup(setup: Setup): Promise<void> {
  const validated = validateSetup(setup);
  try {
    await database.projects.put({ id: PROJECT_ID, setup: validated });
  } catch {
    throw new Error('La sauvegarde locale a échoué. Exportez votre projet pour le conserver.');
  }
}
