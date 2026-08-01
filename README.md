# Mecsek Klíma – ajánlatkérő és ügyfélkövető pilot demó

Magyar nyelvű, mobilbarát webalkalmazás-demó klíma- és hőszivattyú-szerelő vállalkozásoknak. A rendszer minden alapfunkciója külső API-kulcs nélkül, fiktív adatokkal is működik.

> A Mecsek Klíma fiktív demómárka. A nevek, elérhetőségek, ajánlatok és üzleti adatok tesztadatok.

## Fő funkciók

- többlépéses ajánlatkérő és gyors visszahívási kérés;
- dinamikus, kattintható admin áttekintőkártyák;
- kilencoszlopos értékesítési Kanban húzással és akadálymentes státuszválasztóval;
- 11 lépéses, végigvezetett interaktív demóbemutató;
- URL-ben tárolt szűrt navigáció és működő böngésző-visszalépés;
- érdeklődő-, feladat-, státusz- és utánkövetés-kezelés;
- szerkeszthető, nyomtatható/PDF-be menthető árajánlat;
- deduplikált 3 és 7 napos ajánlat-utánkövetés;
- napi, heti és lista naptárnézet ütközésjelzéssel;
- telefonra optimalizált Munkanap felület;
- szimulált e-mail-előnézetek és kommunikációs napló;
- dinamikus értékesítési és területi kimutatások;
- szerkeszthető céges adatok és magyar üzenetsablonok;
- JSON-adatexport, ügyfelenkénti törlés és demó-visszaállítás.
- opcionális, magic-linkes pilotbelépés és munkaterületenként elkülönített központi adatok;
- nyilvános ajánlatkérések ütközésmentes központi fogadása és egyszerű botcsapda.

## Helyi indítás

Előfeltétel: Node.js 22.13 vagy újabb.

```powershell
npm install
npm run dev
```

A fejlesztői kiszolgáló által kiírt helyi címet nyisd meg a böngészőben.

Egy elkészült build egyszerű helyi előnézetéhez:

```powershell
npm run build
npm run preview:local
```

## Ellenőrzések

```powershell
npm run lint
npm run build
npm test
```

## Adattárolási módok

### Helyi demó

Ha nincs megadva környezeti változó, az alkalmazás automatikusan helyi demómódban indul. Az állapot az adott böngésző `localStorage` tárhelyén marad meg.

### Supabase központi pilot

Az opcionális központi mód magic-linkes Supabase Auth belépést, sor-szintű hozzáférés-ellenőrzést és munkaterületenként elkülönített adatokat használ. A nyilvános ajánlatkérés belépés nélkül működik, de kizárólag egy ellenőrzött adatbázis-függvényen keresztül írhat.

Beállítás:

1. Hozz létre egy külön Supabase pilotprojektet.
2. Futtasd le a `docs/supabase-pilot.sql` fájlt a Supabase SQL Editorban.
3. A fájl végén található mintával hozz létre egy munkaterületet, és másold ki a kapott UUID-t.
4. Másold a `.env.example` fájlt `.env.local` néven, majd töltsd ki ezt a három értéket:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_DEMO_WORKSPACE_ID
```

5. Indítsd újra a fejlesztői kiszolgálót, kérj magic-linkes belépést a kezelőfelületen, majd a létrejött Auth-felhasználót rendeld a munkaterülethez a SQL-fájl végén megadott paranccsal.
6. A Supabase Auth URL-beállításainál add hozzá a helyi és a későbbi éles webcímet az engedélyezett átirányításokhoz.

Ha bármelyik környezeti érték hiányzik, az alkalmazás biztonságosan visszaáll a változatlan helyi demómódra. Az anon kulcs nem titok; a védelmet a SQL-sémában lévő RLS-szabályok és a munkaterületi tagság adják. Éles személyes adat előtt külön Supabase projektben ellenőrizni kell a szabályokat.

## E-mail és külső naptár

A demó nem küld valódi e-mailt vagy SMS-t, és nem ír külső naptárba. A felületen interaktív előnézet és helyi naptárszimuláció működik. A `.env.example` tartalmazza a későbbi szerveroldali e-mail-adapterhez fenntartott változókat, de a kliens nem használja és nem jeleníti meg ezeket.

## Jogosultság és adatvédelem

Központi módban a kezelőfelület egyszer használható e-mailes belépési linket használ. A munkaterület adatait csak az ahhoz rendelt tulajdonos vagy munkatárs olvashatja; a törlést az adatbázis tulajdonosi szerepkörhöz köti. A helyi demómód továbbra is jelszó nélküli és kizárólag fiktív adatokhoz készült.

Éles pilot előtt még szükséges:

- jogász által ellenőrzött adatkezelési tájékoztató;
- mentési/visszaállítási folyamat, auditnapló, erősebb spamvédelem és fájlellenőrzés;
- normalizált ügyfél-, ajánlat- és eseménytáblák.

## Demóhasználat

1. A nyilvános oldalon küldj be fiktív ajánlatkérést.
2. Nyisd meg a „Demó kezelőfelületet”.
3. Kattints egy áttekintőkártyára a szűrt listához.
4. Készíts vagy módosíts ajánlatot.
5. Állítsd „Kiküldött” állapotba, majd nézd meg az e-mail-előnézetet és a létrejött utánkövetéseket.
6. Próbáld ki a Naptár és Munkanap menüpontot.
7. A Beállítások oldalon bármikor visszaállíthatod a fiktív adatokat.
