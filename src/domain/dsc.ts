import type { DscProfile, VideoMode } from './types';

/** RGB, external DisplayPort SST, 8b/10b only. Equal slices are deliberately
 * required; accepting arbitrary PPS/rate-control parameters is outside this model.
 */
export function dscProfileMatchesMode(
  profile: DscProfile,
  mode: VideoMode,
  colorDepth: 8 | 10 | 12,
): boolean {
  return (
    profile.modeId === mode.id &&
    profile.colorDepth === colorDepth &&
    profile.version === '1.2' &&
    Number.isInteger(profile.bitsPerPixelX16) &&
    profile.bitsPerPixelX16 >= 128 &&
    profile.bitsPerPixelX16 < colorDepth * 3 * 16 &&
    [1, 2, 4, 6, 8, 10, 12, 16, 20, 24].includes(profile.sliceCount) &&
    mode.width % profile.sliceCount === 0 &&
    Number.isInteger(profile.sliceHeight) &&
    profile.sliceHeight > 0 &&
    mode.height % profile.sliceHeight === 0 &&
    profile.link.encoding === '8b10b' &&
    [1, 2, 4].includes(profile.link.laneCount) &&
    profile.link.fec === true
  );
}

/** Evidence can differ, but both ports must explicitly accept the same settings. */
export function sameDscProfile(left: DscProfile, right: DscProfile): boolean {
  return (
    left.modeId === right.modeId &&
    left.colorDepth === right.colorDepth &&
    left.version === right.version &&
    left.bitsPerPixelX16 === right.bitsPerPixelX16 &&
    left.sliceCount === right.sliceCount &&
    left.sliceHeight === right.sliceHeight &&
    left.link.encoding === right.link.encoding &&
    left.link.laneCount === right.link.laneCount &&
    left.link.fec === right.link.fec
  );
}

/** After 8b/10b coding; a DP 2.x port using this profile is still capped at HBR3. */
export const dscLinkPayloadGbps = (profile: DscProfile): number =>
  (81 * 8 * profile.link.laneCount) / 100;

/** Transport allocation follows Linux DRM v6.12 drm_dp_bw_overhead and
 * drm_dp_link_dsc_symbol_cycles, including per-slice rounding/end markers,
 * 24,016 ppm FEC and 6,000 ppm clock margin. Channel coding is already removed
 * from maxPayloadGbps and must not be deducted again.
 * https://github.com/torvalds/linux/blob/v6.12/drivers/gpu/drm/display/drm_dp_helper.c
 */
export function dscPayloadGbps(mode: VideoMode, profile: DscProfile): number | null {
  if (mode.pixelClockMHz === null || !dscProfileMatchesMode(profile, mode, profile.colorDepth))
    return null;
  const { laneCount } = profile.link;
  const bpp = profile.bitsPerPixelX16 / 16;
  const pixelsPerSlice = mode.width / profile.sliceCount;
  const cycles = profile.sliceCount * (Math.ceil((pixelsPerSlice * bpp) / (8 * laneCount)) + 1);
  const overheadPpm = Math.ceil((cycles * 8 * laneCount * 1_030_016) / (mode.width * bpp));
  return ((mode.pixelClockMHz * bpp) / 1000) * (overheadPpm / 1_000_000);
}
