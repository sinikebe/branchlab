import { Cpu, ExternalLink, Info } from 'lucide-react';
import type { Device } from '../domain';
import { VideoReferenceNotes } from './VideoReferenceNotes';

const number = (value: number | null, unit = '') =>
  value === null
    ? 'Non documenté'
    : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;

export function GpuReference({ device }: { device: Device }) {
  const specs = device.gpu;
  if (!specs) return null;
  const manufacturer = specs.source.kind === 'manufacturer';
  const modified =
    device.source.kind === 'user' ||
    specs.source.kind === 'user' ||
    Object.values(specs.evidence ?? {}).some((source) => source.kind === 'user') ||
    device.ports.some(
      (port) =>
        port.source.kind === 'user' ||
        Object.values(port.evidence ?? {}).some((source) => source.kind === 'user') ||
        port.videoReference?.source.kind === 'user' ||
        Object.values(port.videoReference?.evidence ?? {}).some(
          (source) => source.kind === 'user',
        ) ||
        port.dscProfiles?.some((profile) => profile.source.kind === 'user'),
    );
  const videoPorts = device.ports.filter((port) =>
    port.protocols?.some((protocol) => ['displayport', 'hdmi'].includes(protocol)),
  );
  const dsc =
    videoPorts.length && videoPorts.every((port) => port.dsc === true)
      ? 'Sur les sorties vidéo'
      : videoPorts.length && videoPorts.every((port) => port.dsc === false)
        ? 'Non prise en charge'
        : videoPorts.some((port) => port.dsc !== null)
          ? 'Selon la sortie'
          : 'Non documentée';

  return (
    <section
      className="display-reference gpu-reference"
      aria-label="Caractéristiques de la carte graphique"
    >
      <div className="reference-title">
        <Cpu size={17} />
        <span>
          {manufacturer
            ? modified
              ? 'Profil constructeur · modifié'
              : 'Caractéristiques constructeur sourcées'
            : 'Caractéristiques renseignées'}
        </span>
      </div>
      <h3>{device.name}</h3>
      <dl className="reference-specs">
        <div>
          <dt>Architecture</dt>
          <dd>{specs.architecture}</dd>
        </div>
        <div>
          <dt>Mémoire vidéo</dt>
          <dd>
            {number(specs.memoryGB, 'Go')} {specs.memoryType}
          </dd>
        </div>
        <div>
          <dt>Compression DSC</dt>
          <dd>{dsc}</dd>
        </div>
      </dl>
      {specs.source.url && (
        <a href={specs.source.url} target="_blank" rel="noreferrer">
          {manufacturer ? 'Fiche constructeur' : 'Source des caractéristiques'}{' '}
          <ExternalLink size={12} />
        </a>
      )}
      <details className="reference-notes gpu-details">
        <summary>Spécifications complètes</summary>
        <VideoReferenceNotes ports={device.ports} />
        <dl className="reference-specs">
          <div>
            <dt>Cœurs CUDA</dt>
            <dd>{number(specs.cudaCores)}</dd>
          </div>
          <div>
            <dt>Bus mémoire</dt>
            <dd>{number(specs.memoryBusBits, 'bits')}</dd>
          </div>
          <div>
            <dt>Débit mémoire</dt>
            <dd>{number(specs.memoryBandwidthGBps, 'Go/s')}</dd>
          </div>
          <div>
            <dt>Fréquence de base</dt>
            <dd>{number(specs.baseClockGHz, 'GHz')}</dd>
          </div>
          <div>
            <dt>Fréquence boost</dt>
            <dd>{number(specs.boostClockGHz, 'GHz')}</dd>
          </div>
          <div>
            <dt>Interface</dt>
            <dd>{specs.pcieGeneration ? `PCIe ${specs.pcieGeneration}` : 'Non documentée'}</dd>
          </div>
          <div>
            <dt>Voies PCIe</dt>
            <dd>{number(specs.pcieLanes)}</dd>
          </div>
          <div>
            <dt>Puissance graphique</dt>
            <dd>{number(specs.totalGraphicsPowerW, 'W')}</dd>
          </div>
          <div>
            <dt>Alimentation recommandée</dt>
            <dd>{number(specs.recommendedSystemPowerW, 'W')}</dd>
          </div>
          <div>
            <dt>Écrans annoncés au maximum</dt>
            <dd>{number(specs.maxDisplays)}</dd>
          </div>
        </dl>
        {specs.powerConnectionNotes.length > 0 && (
          <>
            <h4>Raccordement de l’alimentation</h4>
            <ul>
              {specs.powerConnectionNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        )}
        {specs.displaySupportNotes.length > 0 && (
          <>
            <h4>Affichage annoncé</h4>
            <ul>
              {specs.displaySupportNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        )}
        {specs.notes.length > 0 && (
          <ul>
            {specs.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </details>
      <div className="reference-limits">
        <Info size={14} />
        <p>
          La variante de votre carte peut avoir d’autres prises. Ces caractéristiques ne prédisent
          pas les performances en jeu et ne valident pas l’alimentation du PC. Les modes annoncés
          restent à vérifier sur toute la chaîne vidéo.
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
