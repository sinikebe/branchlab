import type { Setup } from './domain';

/**
 * The portable domain graph is intentionally broader than the first editor.
 * Reject layouts it cannot preserve before replacing the user's working copy.
 */
export function validateEditorSetup(project: Setup): void {
  const source = project.devices.find((device) => device.id === project.goal.sourceDeviceId);
  const display = project.devices.find((device) => device.id === project.goal.displayDeviceId);
  const connection = project.connections[0];
  if (
    !source?.ports.length ||
    !display?.ports.length ||
    source.id === display.id ||
    source.kind === 'display' ||
    display.kind !== 'display' ||
    project.cables.length !== 1 ||
    project.connections.length > 1 ||
    project.devices.some((device) => device.routes.length > 0 || device.kind === 'adapter') ||
    (connection &&
      (connection.from.deviceId !== source.id ||
        connection.to.deviceId !== display.id ||
        connection.cableId !== project.cables[0].id))
  ) {
    throw new Error(
      'Ce setup dépasse le périmètre actuel de l’éditeur : une source avec ports, un écran avec ports et un câble direct. Le projet enregistré est conservé.',
    );
  }
}
