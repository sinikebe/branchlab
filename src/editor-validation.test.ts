import { describe, expect, it } from 'vitest';
import { createGpu, createSetup, SETUP_SCHEMA, type Setup } from './domain';
import { validateEditorSetup } from './editor-validation';

function expectValidDomain(project: Setup): void {
  expect(SETUP_SCHEMA.safeParse(project).success).toBe(true);
}

describe('editor import boundary', () => {
  it('accepts a connected or disconnected direct setup without changing it', () => {
    const project = createSetup();
    const before = structuredClone(project);
    expect(() => validateEditorSetup(project)).not.toThrow();
    expect(project).toEqual(before);
    project.connections = [];
    expect(() => validateEditorSetup(project)).not.toThrow();
  });

  it.each(['source', 'display'] as const)(
    'rejects a %s without ports even when the graph schema accepts it',
    (target) => {
      const project = createSetup();
      project.connections = [];
      const id = target === 'source' ? project.goal.sourceDeviceId : project.goal.displayDeviceId;
      project.devices.find((device) => device.id === id)!.ports = [];
      expectValidDomain(project);
      expect(() => validateEditorSetup(project)).toThrow(/source avec ports, un écran avec ports/);
    },
  );

  it('rejects schema-valid endpoints pointing away from the selected source and display', () => {
    const project = createSetup();
    const connection = project.connections[0];
    [connection.from, connection.to] = [connection.to, connection.from];
    expectValidDomain(project);
    expect(() => validateEditorSetup(project)).toThrow(/projet enregistré est conservé/);
  });

  it('rejects a connected inactive source instead of silently editing another connection', () => {
    const project = createSetup();
    const inactive = createGpu('rtx5080');
    inactive.id = 'inactive-gpu';
    project.devices.push(inactive);
    project.connections[0].from.deviceId = inactive.id;
    expectValidDomain(project);
    expect(() => validateEditorSetup(project)).toThrow(/périmètre actuel/);
  });

  it('rejects schema-valid multi-hop setups that the initial editor cannot preserve', () => {
    const project = createSetup();
    const input = structuredClone(project.devices[1].ports[0]);
    input.id = 'adapter-in';
    const output = structuredClone(project.devices[0].ports[0]);
    output.id = 'adapter-out';
    project.devices.push({
      id: 'adapter',
      name: 'Adaptateur',
      kind: 'adapter',
      source: input.source,
      ports: [input, output],
      routes: [
        {
          fromPortId: input.id,
          toPortId: output.id,
          supported: true,
          maxPayloadGbps: 25.92,
          source: input.source,
        },
      ],
    });
    const secondCable = structuredClone(project.cables[0]);
    secondCable.id = 'second-cable';
    project.cables.push(secondCable);
    project.connections[0].to = { deviceId: 'adapter', portId: input.id };
    project.connections.push({
      id: 'second-connection',
      cableId: secondCable.id,
      from: { deviceId: 'adapter', portId: output.id },
      to: { deviceId: project.goal.displayDeviceId, portId: project.devices[1].ports[0].id },
    });
    expectValidDomain(project);
    expect(() => validateEditorSetup(project)).toThrow(/périmètre actuel/);
  });

  it('accepts one active source and display while retaining an inactive GPU', () => {
    const project = createSetup();
    const motherboard = structuredClone(project.devices[0]);
    motherboard.id = 'motherboard';
    motherboard.name = 'Sortie de carte mère';
    motherboard.kind = 'other';
    project.devices.push(motherboard);
    project.goal.sourceDeviceId = motherboard.id;
    project.connections[0].from.deviceId = motherboard.id;
    expectValidDomain(project);
    const before = structuredClone(project);
    expect(() => validateEditorSetup(project)).not.toThrow();
    expect(project).toEqual(before);
    expect(project.devices.some((device) => device.kind === 'gpu')).toBe(true);
  });
});
