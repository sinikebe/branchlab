import { ExternalLink, Info, Layers3 } from 'lucide-react';
import type { Device, Source } from '../domain';

function ReferenceList({
  title,
  items,
  source,
}: {
  title: string;
  items: string[];
  source: Source;
}) {
  if (!items.length) return null;
  return (
    <section className="motherboard-spec-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {source.url && (
        <a href={source.url} target="_blank" rel="noreferrer">
          Source : {title.toLocaleLowerCase('fr-FR')} <ExternalLink size={11} />
        </a>
      )}
    </section>
  );
}

export function MotherboardReference({ device }: { device: Device }) {
  const specs = device.motherboard;
  if (!specs) return null;
  const modified =
    device.source.kind === 'user' ||
    specs.source.kind === 'user' ||
    Object.values(specs.evidence ?? {}).some((item) => item.kind === 'user') ||
    device.ports.some(
      (port) =>
        port.source.kind === 'user' ||
        Object.values(port.evidence ?? {}).some((item) => item.kind === 'user'),
    );
  const sourceFor = (key: string) => specs.evidence?.[key] ?? specs.source;
  return (
    <section
      className="display-reference motherboard-reference"
      aria-label="Caractéristiques de la carte mère"
    >
      <div className="reference-title">
        <Layers3 size={17} />
        <span>
          {specs.source.kind === 'manufacturer'
            ? modified
              ? 'Profil constructeur · modifié'
              : 'Caractéristiques constructeur sourcées'
            : 'Caractéristiques renseignées'}
        </span>
      </div>
      <h3>{device.name}</h3>
      <dl className="reference-specs">
        <div>
          <dt>Socket / chipset</dt>
          <dd>
            {specs.socket} · {specs.chipset}
          </dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{specs.formFactor}</dd>
        </div>
        <div>
          <dt>Mémoire</dt>
          <dd>
            {specs.memory.slots} slots {specs.memory.type} · jusqu’à {specs.memory.maxCapacityGB} Go
          </dd>
        </div>
      </dl>
      {specs.source.url && (
        <a href={specs.source.url} target="_blank" rel="noreferrer">
          Fiche constructeur <ExternalLink size={12} />
        </a>
      )}
      <details className="reference-notes gpu-details motherboard-details">
        <summary>Spécifications complètes</summary>
        <ReferenceList
          title="Processeurs compatibles"
          items={specs.cpuSupport}
          source={sourceFor('cpuSupport')}
        />
        <ReferenceList
          title="Mémoire et overclocking"
          items={[
            ...(specs.memory.maxOcMtps === null
              ? []
              : [
                  `Jusqu’à ${specs.memory.maxOcMtps.toLocaleString('fr-FR')} MT/s annoncés en overclocking, selon le processeur et la configuration mémoire.`,
                ]),
            ...specs.memory.notes,
          ]}
          source={sourceFor('memory')}
        />
        <ReferenceList
          title="PCIe"
          items={specs.expansionSlots}
          source={sourceFor('expansionSlots')}
        />
        <ReferenceList title="Stockage" items={specs.storage} source={sourceFor('storage')} />
        <ReferenceList
          title="Connectique arrière"
          items={specs.rearConnectors}
          source={sourceFor('rearConnectors')}
        />
        <ReferenceList
          title="Connecteurs internes"
          items={specs.internalConnectors}
          source={sourceFor('internalConnectors')}
        />
        <ReferenceList title="Réseau" items={specs.network} source={sourceFor('network')} />
        <ReferenceList title="Audio" items={specs.audio} source={sourceFor('audio')} />
        <ReferenceList
          title="Affichage et dépendances au processeur"
          items={specs.displayNotes}
          source={sourceFor('displayNotes')}
        />
        <ReferenceList title="Précisions constructeur" items={specs.notes} source={specs.source} />
      </details>
      <div className="reference-limits">
        <Info size={14} />
        <p>
          Les prises vidéo de la carte mère utilisent le circuit graphique du processeur. Leur
          présence et la compatibilité AM5 ne confirment pas qu’un signal sera disponible. Les
          vitesses mémoire OC et les modes d’affichage dépendent de la configuration.
        </p>
      </div>
      {modified && (
        <p className="override-notice">
          Cette fiche contient des déclarations utilisateur. Leur provenance est conservée dans les
          sources et l’export du setup.
        </p>
      )}
    </section>
  );
}
