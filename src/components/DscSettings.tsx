import { useState, type FormEvent } from 'react';
import type { DscProfile, VideoMode } from '../domain';

interface Props {
  mode: VideoMode;
  colorDepth: 8 | 10 | 12;
  available: boolean;
  current?: DscProfile;
  onSave: (profile: DscProfile) => void;
  onRemove: () => void;
}

/** A declared, accepted transport profile; this form never invents device capabilities. */
export function DscSettings({ mode, colorDepth, available, current, onSave, onRemove }: Props) {
  const [bpp, setBpp] = useState(current ? String(current.bitsPerPixelX16 / 16) : '');
  const [slices, setSlices] = useState(current ? String(current.sliceCount) : '');
  const [height, setHeight] = useState(current ? String(current.sliceHeight) : '');
  const [lanes, setLanes] = useState(current ? String(current.link.laneCount) : '');
  const [reference, setReference] = useState(current?.source.label ?? '');
  const [url, setUrl] = useState(current?.source.url ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bitsPerPixelX16 = Number(bpp) * 16;
    const sliceCount = Number(slices);
    const sliceHeight = Number(height);
    const laneCount = Number(lanes);
    if (
      !confirmed ||
      !Number.isInteger(bitsPerPixelX16) ||
      bitsPerPixelX16 < 128 ||
      bitsPerPixelX16 >= colorDepth * 3 * 16 ||
      ![1, 2, 4, 6, 8, 10, 12, 16, 20, 24].includes(sliceCount) ||
      mode.width % sliceCount !== 0 ||
      !Number.isInteger(sliceHeight) ||
      sliceHeight < 1 ||
      mode.height % sliceHeight !== 0 ||
      ![1, 2, 4].includes(laneCount)
    ) {
      setError(
        'Vérifiez les paramètres : bpp ≥ 8 par pas de 1/16, tranches divisant l’image et nombre de voies renseigné.',
      );
      return;
    }
    if (url && !/^https?:\/\//.test(url)) {
      setError('La référence doit être un lien HTTP ou HTTPS.');
      return;
    }
    onSave({
      modeId: mode.id,
      colorDepth,
      version: '1.2',
      bitsPerPixelX16,
      sliceCount,
      sliceHeight,
      link: { encoding: '8b10b', laneCount: laneCount as 1 | 2 | 4, fec: true },
      source: {
        kind: 'user',
        label:
          reference.trim() || 'Profil DSC accepté par les deux ports, déclaré par l’utilisateur',
        ...(url.trim() ? { url: url.trim() } : {}),
      },
    });
    setError('');
    setConfirmed(false);
  };

  return (
    <details className="dsc-settings">
      <summary>Paramètres DSC avancés</summary>
      <p className="fine-print">
        Pour vérifier un réglage connu, accepté par la sortie GPU et l’entrée de l’écran. Aucun taux
        de compression n’est déduit de la seule présence de DSC.
      </p>
      {!available ? (
        <p className="fine-print">
          Ce calcul couvre une liaison directe DisplayPort depuis la carte graphique.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="dsc-context">
            {mode.width} × {mode.height} · {mode.refreshHz} Hz · RGB {colorDepth} bits
          </p>
          <p className="fine-print">
            DSC 1.2 · DisplayPort SST, codage 8b/10b et correction d’erreurs FEC activée. Ces
            paramètres décrivent un profil accepté, pas une négociation mesurée par BranchLab.
          </p>
          <label className="field-label" htmlFor="dsc-bpp">
            Bits par pixel après compression
          </label>
          <input
            id="dsc-bpp"
            type="number"
            min="8"
            max={colorDepth * 3 - 0.0625}
            step="0.0625"
            required
            value={bpp}
            onChange={(event) => setBpp(event.target.value)}
          />
          <div className="dsc-field-pair">
            <div>
              <label className="field-label" htmlFor="dsc-slices">
                Tranches par ligne
              </label>
              <select
                id="dsc-slices"
                required
                value={slices}
                onChange={(event) => setSlices(event.target.value)}
              >
                <option value="">À renseigner</option>
                {[1, 2, 4, 6, 8, 10, 12, 16, 20, 24].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="dsc-height">
                Hauteur de tranche
              </label>
              <input
                id="dsc-height"
                type="number"
                min="1"
                max={mode.height}
                step="1"
                required
                value={height}
                onChange={(event) => setHeight(event.target.value)}
              />
            </div>
          </div>
          <label className="field-label" htmlFor="dsc-lanes">
            Voies DisplayPort utilisées
          </label>
          <select
            id="dsc-lanes"
            required
            value={lanes}
            onChange={(event) => setLanes(event.target.value)}
          >
            <option value="">À renseigner</option>
            <option value="1">1 voie · validation incomplète</option>
            <option value="2">2 voies · validation incomplète</option>
            <option value="4">4 voies</option>
          </select>
          <p className="fine-print">
            La validation complète couvre actuellement quatre voies. Les profils à une ou deux voies
            sont conservés, mais leur débit disponible reste à vérifier.
          </p>
          <label className="field-label" htmlFor="dsc-reference">
            Origine du profil DSC
          </label>
          <input
            id="dsc-reference"
            value={reference}
            maxLength={2000}
            placeholder="Ex. relevé des paramètres négociés"
            onChange={(event) => setReference(event.target.value)}
          />
          <label className="field-label" htmlFor="dsc-url">
            Lien de référence (facultatif)
          </label>
          <input
            id="dsc-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <label className="checkbox-row dsc-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              required
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>Je déclare ce profil accepté par les deux ports, FEC compris.</span>
          </label>
          <p className="fine-print">
            L’enregistrement renseigne DSC pour ces deux ports et cet objectif. Les débits de
            liaison et les profondeurs de couleur se renseignent séparément dans Éléments.
          </p>
          {error && (
            <p className="override-notice" role="alert">
              {error}
            </p>
          )}
          <button className="button secondary full" type="submit">
            Enregistrer le profil DSC
          </button>
          {current?.source.kind === 'user' && (
            <button className="inline-link" type="button" onClick={onRemove}>
              Retirer le profil DSC utilisateur
            </button>
          )}
        </form>
      )}
    </details>
  );
}
