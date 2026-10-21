# Third-party graphic resources

Tabler Icons: https://github.com/tabler/tabler-icons — MIT. Copyright and license: tabler/LICENSE. Selected non-brand outline SVGs converted into Canvas paths; revision and hashes: sources.json.

Cairo: https://github.com/google/fonts/tree/main/ofl/cairo — SIL OFL 1.1. Unmodified original TTF; see cairo/OFL.txt and sources.json. CSS family alias: StudioCairo.

D3 Ease 3.0.1: https://github.com/d3/d3-ease — BSD-3-Clause; see licenses/d3-ease.txt in the deployed bundle.

Rough.js 4.6.6: https://github.com/rough-stuff/rough — MIT; see licenses/roughjs.txt. Its bundled dependencies hachure-fill 0.5.2, path-data-parser 0.1.0, points-on-curve 0.2.0 and points-on-path 0.2.1 are MIT; their complete notices are included under licenses/.

The catalog also lists reference projects that are not distributed or run by this package. Their own licenses apply if integrated later.

## Chart.js 4.5.1 and @kurkle/color 0.3.4

Official Chart.js npm UMD bundle from https://github.com/chartjs/Chart.js (MIT), including @kurkle/color (https://github.com/kurkle/color, MIT). Exact installation resolved and integrity-pinned in package-lock.json. Build copies chart.umd.min.js and both licenses to public/vendor/. Used for literal-value comparison charts; animation disabled and instances destroyed after bitmap snapshot.
