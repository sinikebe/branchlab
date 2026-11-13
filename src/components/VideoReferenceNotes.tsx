import { ExternalLink } from 'lucide-react';
import type { Port } from '../domain';

const number = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

/** Published port facts remain distinct from a negotiated whole-chain video budget. */
export function VideoReferenceNotes({ ports }: { ports: Port[] }) {
  return ports.map((port) => {
    const reference = port.videoReference;
    if (!reference) return null;
    const sources = [
      ...new Map(
        [reference.source, ...Object.values(reference.evidence ?? {})].map((source) => [
          source.url ?? `${source.kind}:${source.label}`,
          source,
        ]),
      ).values(),
    ];
    return (
      <section
        className="motherboard-spec-section"
        aria-label={`Documentation vidéo : ${port.label}`}
        key={port.id}
      >
        <h4>{port.label}</h4>
        <ul>
          <li>
            {reference.version} · {reference.transport}
          </li>
          <li>
            {reference.rawBandwidthGbps === null
              ? 'Débit brut : non documenté pour ce port.'
              : `Débit brut annoncé : ${number(reference.rawBandwidthGbps)} Gbit/s. Ce débit brut n’est pas le budget vidéo utile de la chaîne.`}
          </li>
          {(reference.laneCount !== null || reference.laneRateGbps !== null) && (
            <li>
              {reference.laneCount === null
                ? 'Nombre de voies non documenté'
                : `${reference.laneCount} voies`}
              {reference.laneRateGbps === null
                ? ' ; débit par voie non documenté.'
                : ` ; ${number(reference.laneRateGbps)} Gbit/s par voie.`}
            </li>
          )}
          {reference.maxMode && <li>Plafond annoncé : {reference.maxMode}</li>}
          {reference.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        {sources.map((source) =>
          source.url ? (
            <p key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                Source : {source.label} <ExternalLink size={11} />
              </a>
            </p>
          ) : (
            <p className="fine-print" key={`${source.kind}:${source.label}`}>
              Source : {source.label}
            </p>
          ),
        )}
      </section>
    );
  });
}
