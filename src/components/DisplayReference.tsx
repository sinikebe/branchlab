import { ExternalLink, Info, Monitor } from 'lucide-react';
import { VIDEO_MODES, type Device, type Port } from '../domain';

export function PublishedModes({ port, onSelect }: { port: Port; onSelect: (id: string) => void }) {
  const modeSource = port.evidence?.supportedModeIds ?? port.source;
  const userDeclared = modeSource.kind === 'user';
  const documented = VIDEO_MODES.filter((mode) => port.supportedModeIds?.includes(mode.id));
  return (
    <section
      className="published-modes"
      aria-label={
        userDeclared ? 'Modes déclarés par l’utilisateur' : 'Modes annoncés par le constructeur'
      }
    >
      <div className="section-kicker">MODES ANNONCÉS SUR CETTE ENTRÉE</div>
      <p>
        {userDeclared
          ? 'Déclarés par l’utilisateur pour cette entrée.'
          : 'Documentés pour l’écran.'}{' '}
        La chaîne complète reste à vérifier.
      </p>
      <div className="published-mode-list">
        {documented.map((mode) => (
          <button key={mode.id} onClick={() => onSelect(mode.id)}>
            {mode.width} × {mode.height}
            <span>{mode.refreshHz} Hz</span>
          </button>
        ))}
      </div>
      {!documented.length && <p>Aucun mode vidéo documenté sur cette prise.</p>}
      {port.modeListComplete === false && (
        <small>Liste partielle : un mode absent reste non documenté.</small>
      )}
    </section>
  );
}

export function DisplayReference({ device, port }: { device: Device; port: Port }) {
  const specs = device.display;
  const override =
    device.source.kind === 'user' ||
    device.ports.some(
      (item) =>
        item.source.kind === 'user' ||
        Object.values(item.evidence ?? {}).some((source) => source.kind === 'user'),
    );
  return (
    <section className="display-reference" aria-label="Fiche constructeur de l’écran">
      <div className="reference-title">
        <Monitor size={17} />
        <span>{override ? 'Profil constructeur · modifié' : 'Profil constructeur sourcé'}</span>
      </div>
      <h3>{device.name}</h3>
      {specs && (
        <dl className="reference-specs">
          <div>
            <dt>Dalle</dt>
            <dd>
              {specs.diagonalInches}″ · {specs.panelTechnology}
            </dd>
          </div>
          <div>
            <dt>Résolution native</dt>
            <dd>
              {specs.nativeWidth} × {specs.nativeHeight}
            </dd>
          </div>
          <div>
            <dt>Fréquence annoncée</dt>
            <dd>Jusqu’à {specs.maxRefreshHz} Hz</dd>
          </div>
          <div>
            <dt>Couleurs de la dalle</dt>
            <dd>{specs.colorDepthBits ?? '—'} bits</dd>
          </div>
        </dl>
      )}
      {device.source.url && (
        <a href={device.source.url} target="_blank" rel="noreferrer">
          Fiche officielle Corsair <ExternalLink size={12} />
        </a>
      )}
      <div className="reference-limits">
        <Info size={14} />
        <p>
          Une fréquence annoncée et les couleurs de la dalle ne garantissent pas le mode RGB sur
          toute la chaîne. Les débits, timings et paramètres DSC non documentés restent inconnus.
        </p>
      </div>
      {port.source.kind === 'user' && (
        <p className="override-notice">
          Cette entrée contient des déclarations utilisateur. Elles sont conservées dans l’export et
          distinguées des données constructeur.
        </p>
      )}
      <details className="physical-ports">
        <summary>Connectique complète · {device.ports.length} prises</summary>
        <ul>
          {device.ports.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              <small>
                {item.protocols?.some((protocol) => ['displayport', 'hdmi'].includes(protocol))
                  ? 'Fonction vidéo renseignée'
                  : 'Aucune fonction vidéo documentée'}
              </small>
            </li>
          ))}
        </ul>
      </details>
      {specs && (
        <details className="reference-notes">
          <summary>Conditions d’utilisation & limites</summary>
          <ul>
            {specs.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
