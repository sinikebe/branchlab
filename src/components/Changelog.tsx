import releases from '../changelog.json';
import archivedReleases from '../changelog-archive.json';

const formatDate = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

function ReleaseList({
  entries,
  label,
  archived = false,
}: {
  entries: { date: string; changes: string[]; version?: string }[];
  label: string;
  archived?: boolean;
}) {
  return (
    <ol className="changelog-list" aria-label={label}>
      {entries.map((release, index) => (
        <li className="changelog-release" key={release.date + '-' + index}>
          {archived && (
            <div className="changelog-heading"><h3>Version {release.version}</h3></div>
          )}
          <time dateTime={release.date}>
            {formatDate.format(new Date(release.date + 'T00:00:00Z'))}
          </time>
          <ul>{release.changes.map((change) => <li key={change}>{change}</li>)}</ul>
        </li>
      ))}
    </ol>
  );
}

export function Changelog({ currentVersion }: { currentVersion: string }) {
  return (
    <>
      <div className="changelog-heading">
        <h3>Version {currentVersion}</h3>
        <span className="current-release">Version actuelle</span>
      </div>
      <p>Les améliorations de votre atelier, au fil des mises à jour.</p>
      <ReleaseList entries={releases} label="Historique des versions" />
      <details className="reference-notes">
        <summary>Historique de la numérotation précédente</summary>
        <p>Ces versions précèdent la nouvelle numérotation démarrée à 0.0.1.</p>
        <ReleaseList entries={archivedReleases} label="Ancienne numérotation" archived />
      </details>
    </>
  );
}
