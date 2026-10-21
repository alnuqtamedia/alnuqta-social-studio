# Third-party graphic resources

Tabler Icons: https://github.com/tabler/tabler-icons — MIT. Copyright and license: tabler/LICENSE. Selected non-brand outline SVGs converted into Canvas paths; revision and hashes: sources.json.

Cairo: https://github.com/google/fonts/tree/main/ofl/cairo — SIL OFL 1.1. Unmodified original TTF; see cairo/OFL.txt and sources.json. CSS family alias: StudioCairo.

D3 Ease 3.0.1: https://github.com/d3/d3-ease — BSD-3-Clause; see licenses/d3-ease.txt in the deployed bundle.

Rough.js 4.6.6: https://github.com/rough-stuff/rough — MIT; see licenses/roughjs.txt. Its bundled dependencies hachure-fill 0.5.2, path-data-parser 0.1.0, points-on-curve 0.2.0 and points-on-path 0.2.1 are MIT; their complete notices are included under licenses/.

The catalog also lists reference projects that are not distributed or run by this package. Their own licenses apply if integrated later.

## Chart.js 4.5.1 and @kurkle/color 0.3.4

Official Chart.js npm UMD bundle from https://github.com/chartjs/Chart.js (MIT), including @kurkle/color (https://github.com/kurkle/color, MIT). Exact installation resolved and integrity-pinned in package-lock.json. Build copies chart.umd.min.js and both licenses to public/vendor/. Used for literal-value comparison charts; animation disabled and instances destroyed after bitmap snapshot.

## Licensed soundtrack and sound design

13 local audio assets: five 28-second music excerpts from the CC0 FreePD mirror at SoundSafari/CC0-1.0-Music (655388f987eacf6d08d73080fcc3e727f267bfde), and eight Kenney Interface Sounds from Calinou/kenney-interface-sounds (4596a49eaf5a533948d49a47467f606bcdea70ff). Per-file artist, original path, adaptation and SHA-256 are in public/audio/catalog.json. Music is trimmed, normalized, downmixed to mono and encoded at 64kbps/32kHz. Runtime loops crossfade; they are excerpts, not whole original tracks. Both CC0 notices ship under public/audio/.

ZzFX by Frank Force, MIT, revision aab7e2b6b9086746b6e55fab75c75ce03e716c49. Original full notice: licenses/zzfx.txt. zzfx-samples.js adapts the module to a classic script and replaces the implicit AudioContext with null. Only buildSamples is used, in the editor's existing audio clock. Five effect parameter presets are original studio sound design; no third-party melodies are copied. They are not recordings of news events.

## Canvas transition adaptations

gl-transitions/gl-transitions revision 66a975917ab01a738408c81eb74fd329935e1c72: directionalwipe.glsl and circleopen.glsl by gre, Directional.glsl by Gaëtan Renaudeau. Each has an MIT header. Source shaders and the full MIT license are retained under gl-transitions/. The studio implements Canvas adaptations (diagonal clip, circular clip, horizontal push), with sharp rather than shader-smoothed edges for low CPU overhead. No WebGL runtime dependency is added.
