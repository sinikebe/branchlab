import { z } from 'zod';
import type { Setup } from './types';

const id = z.string().min(1).max(160);
const name = z.string().min(1).max(240);
const source = z.object({
  kind: z.enum(['manufacturer', 'standard', 'user', 'demo']),
  label: z.string().min(1).max(2000),
  url: z
    .string()
    .url()
    .refine((url) => /^https?:\/\//.test(url), 'Lien HTTP(S) attendu')
    .optional(),
  checkedAt: z.string().max(30).optional(),
});
const nullableStrings = z.array(id).max(200).nullable();
const payload = z.number().positive().max(100000).nullable();
const port = z.object({
  id,
  label: name,
  connector: id,
  role: z.enum(['source', 'sink', 'bidirectional']),
  protocols: nullableStrings,
  maxPayloadGbps: payload,
  dsc: z.boolean().nullable(),
  supportedModeIds: nullableStrings,
  supportedColorDepths: z
    .array(z.union([z.literal(8), z.literal(10), z.literal(12)]))
    .nullable()
    .optional(),
  source,
  evidence: z.record(z.string(), source).optional(),
});
const route = z.object({
  fromPortId: id,
  toPortId: id,
  supported: z.boolean().nullable(),
  maxPayloadGbps: payload,
  source,
});
const endpoint = z.object({ deviceId: id, portId: id });

export const SETUP_SCHEMA: z.ZodType<Setup> = z
  .object({
    schemaVersion: z.literal(1),
    name,
    devices: z
      .array(
        z.object({
          id,
          name,
          kind: z.enum(['gpu', 'display', 'adapter', 'other']),
          ports: z.array(port).max(100),
          routes: z.array(route).max(500),
          source,
        }),
      )
      .min(1)
      .max(100),
    cables: z
      .array(
        z.object({
          id,
          name,
          ends: z.tuple([id, id]),
          protocols: nullableStrings,
          maxPayloadGbps: payload,
          direction: z.enum(['forward', 'bidirectional']).optional(),
          source,
        }),
      )
      .max(200),
    connections: z.array(z.object({ id, from: endpoint, to: endpoint, cableId: id })).max(200),
    goal: z.object({
      sourceDeviceId: id,
      displayDeviceId: id,
      modeId: id,
      colorDepth: z.union([z.literal(8), z.literal(10), z.literal(12)]),
    }),
    conditions: z.object({
      computerOperational: z.boolean().nullable(),
      displayPowered: z.boolean().nullable(),
    }),
  })
  .superRefine((setup, context) => {
    const fail = (message: string) => context.addIssue({ code: 'custom', message });
    const devices = new Map(setup.devices.map((device) => [device.id, device]));
    const cables = new Set(setup.cables.map((cable) => cable.id));
    if (devices.size !== setup.devices.length) fail('Identifiants d’appareil dupliqués');
    if (cables.size !== setup.cables.length) fail('Identifiants de câble dupliqués');
    if (new Set(setup.connections.map((entry) => entry.id)).size !== setup.connections.length)
      fail('Identifiants de connexion dupliqués');
    for (const device of setup.devices) {
      const ports = new Set(device.ports.map((entry) => entry.id));
      if (ports.size !== device.ports.length) fail('Identifiants de port dupliqués');
      for (const route of device.routes)
        if (!ports.has(route.fromPortId) || !ports.has(route.toPortId))
          fail('Route interne : port introuvable');
    }
    const occupied = new Set<string>();
    const usedCables = new Set<string>();
    for (const connection of setup.connections) {
      if (!cables.has(connection.cableId)) fail('Câble référencé introuvable');
      if (usedCables.has(connection.cableId))
        fail('Un même câble ne peut pas relier plusieurs connexions');
      usedCables.add(connection.cableId);
      for (const point of [connection.from, connection.to]) {
        if (!devices.get(point.deviceId)?.ports.some((entry) => entry.id === point.portId))
          fail('Port référencé introuvable');
        const key = JSON.stringify([point.deviceId, point.portId]);
        if (occupied.has(key)) fail('Un port physique ne peut accueillir qu’une connexion');
        occupied.add(key);
      }
      if (
        connection.from.deviceId === connection.to.deviceId &&
        connection.from.portId === connection.to.portId
      )
        fail('Un port ne peut pas être relié à lui-même');
    }
    if (!devices.has(setup.goal.sourceDeviceId) || !devices.has(setup.goal.displayDeviceId))
      fail('Appareil de l’objectif introuvable');
    if (setup.goal.sourceDeviceId === setup.goal.displayDeviceId)
      fail('La source et l’écran doivent être distincts');
  });
