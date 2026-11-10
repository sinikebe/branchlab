import releases from '../changelog.json';

const formatDate = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export function Changelog({ currentVersion }: { currentVersion: string }) {
  return (
    <>
      <p>Les améliorations de votre atelier, au fil des versions.</p>
      <ol className="changelog-list" aria-label="Historique des versions">
        {releases.map((release) => (
          <li className="changelog-release" key={release.version}>
            <div className="changelog-heading">
              <h3>Version {release.version}</h3>
              {release.version === currentVersion && (
                <span className="current-release">Version actuelle</span>
              )}
            </div>
            <time dateTime={release.date}>
              {formatDate.format(new Date(`${release.date}T00:00:00Z`))}
            </time>
            <ul>
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}
