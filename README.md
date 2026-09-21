# Arthur Cycling

Mobil-first React/Vite-app med server-side Intervals.icu integration og en træningsplan i den eksisterende mørke/lime/cyan-identitet.

## Lokal udvikling

Node.js 22.13+ (eller 24+).

```sh
npm ci
npm run dev
npm test
npm run build
```

Vite serverer frontend. `/api/latest-activity` køres af Vercel, ikke af Vites udviklingsserver; lokalt vises en ærlig fejltilstand uden opdigtede aktivitetsdata.

## Træning

- Mandag–søndag med ugenummer, ugeskift, valg af dag, dagsfokus og en tidslinje. Flere aktiviteter pr. dag understøttes.
- Opret, rediger og slet klubtræning, interval, rolig tur, restitution, styrke, løb og hvile.
- Detaljer med dato, minutter, intensitet, beskrivelse, intervaltrin, valgfrie wattmål og styrkeøvelser. Intervaltid valideres mod totalen.
- Tom plan fra start. Ugeskabelonen indsættes kun efter et klik og består udelukkende af udkast. Coach/forælder tilpasser og markerer som planlagt. Ingen automatisk belastningsstigning.
- Planlagte aktiviteter kan gennemføres på dagen eller senere, springes over og fortrydes. XP udledes af gennemførte aktiviteter, så samme aktivitet aldrig giver XP to gange. Hvile/restitution giver 30 XP, øvrige typer 50 XP uanset watt, intensitet eller placering. 500 XP pr. level.
- Hjem viser næste planlagte aktivitet, næste planlagte løb samt faktiske XP/level fra planen. Tidligere statiske prototypeværdier er fjernet.
- Datoer følger kalenderen i Danmark. Ugearitmetik er uafhængig af sommertid og enhedens tidszone.

### Lagring

Planen ligger i browserens `localStorage` under `arthur-cycling.plan.v1` med versioneret skema. Den er kun på den aktuelle enhed/browser og følger ikke automatisk med til en anden telefon. Sletning af browserdata sletter planen. Visningen opdateres ved ændringer fra andre faner; samtidig redigering på tværs af faner er ikke en samarbejdsfunktion. Læsefejl blokerer overskrivning, og skrivefejl vises uden at påstå, at ændringen blev gemt.

Første version har ingen coach-login, cloud-synkronisering eller automatisk match til Intervals-aktiviteter. Gennemførelse registreres manuelt. Typen 'Løb' styres af planen, ikke Intervals' race-flag.

## Intervals.icu

Følgende environment variables skal ligge server-side i Vercel:

- `intervals_api_key`
- `intervals_athlete_id`

De må aldrig committes eller tilføjes som `VITE_*` variabler. Den eksisterende API-normalisering i `api/latest-activity.js` er bevaret. Frontend bruger fortsat kun det normaliserede `activity`-objekt.

Frontend viser indlæsning/fejl ved manglende data. Ved fejlet opdatering beholdes tidligere hentede tal med mærket **SIDST HENTET**. **LIVE DATA** vises kun efter en vellykket hentning. Ingen demoaktivitet bruges som fallback.

## PWA

Eksisterende manifest, SVG-ikon og standalone-visning er bevaret. Projektet har fortsat ingen service worker eller offline app-cache; der loves ikke offline-indlæsning af appen. Mobilnavigation tager højde for safe-area nederst.

## Verifikation

`npm test` kører 14 tests: uge-/årsskift, sommertid, udkast, XP/fortrydelse, fremtidig gennemførelse, datavalidering og API-normalisering samt React-brugerforløb for oprettelse, redigering, styrkeøvelser, sletning, genindlæsning og fejl i API/lagring. API-data i testene er eksplicitte fixtures. React-testene bruger JSDOM og erstatter ikke visuel kontrol i en rigtig browser.

`src/main.jsx` starter appen; `src/App.jsx` indeholder den fælles app og kan indlæses isoleret i tests.

Browserkontrol før merge:

1. Kontrollér LIVE DATA, metrics og HÅRDT RYK på Hjem.
2. Opret en planlagt træning med intervaller og wattmål, åbn den fra Hjem, gennemfør og fortryd; kontrollér XP efter genindlæsning.
3. Opret styrke med øvelser og en hviledag. Kontrollér udkast, spring over og sletning.
4. Skift uge; kontrollér mandag–søndag samt en tom uge.
5. Kontrollér 320–390 px mobilbredde og desktop, dialogscroll, tastatur/Escape og fejl ved lagring/API.

## Næste skridt

Fælles lagring med adgangskontrol for forælder/coach, derefter eksplicit match mellem plan og faktiske aktiviteter. Power curve kræver verificeret Intervals.icu API-understøttelse; ingen nye endpoints er antaget.
