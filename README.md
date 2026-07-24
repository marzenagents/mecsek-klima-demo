# Mecsek Klíma – ajánlatkérő és ügyfélkövető pilot demó

Magyar nyelvű, mobilbarát webalkalmazás-demó klíma- és hőszivattyú-szerelő vállalkozásoknak. A rendszer minden alapfunkciója külső API-kulcs nélkül, fiktív adatokkal is működik.

> A Mecsek Klíma fiktív demómárka. A nevek, elérhetőségek, ajánlatok és üzleti adatok tesztadatok.

## Fő funkciók

- többlépéses ajánlatkérő és gyors visszahívási kérés;
- dinamikus, kattintható admin áttekintőkártyák;
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

## Helyi indítás

Előfeltétel: Node.js 22.13 vagy újabb.

```powershell
npm install
npm run dev
```

A fejlesztői kiszolgáló által kiírt helyi címet nyisd meg a böngészőben.

## Ellenőrzések

```powershell
npm run lint
npm run build
npm test
```

## Adattárolási módok

### Helyi demó

Ha nincs megadva környezeti változó, az alkalmazás automatikusan helyi demómódban indul. Az állapot az adott böngésző `localStorage` tárhelyén marad meg.

### Supabase pilot-adapter

A kliensben előkészített adapter a következő értékeket használja:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_DEMO_WORKSPACE_ID
```

A minimális pilot tábla leírása: `docs/supabase-pilot.sql`.

Fontos korlát: a Supabase-adapter csak megfelelően beállított Supabase Auth és sor-szintű hozzáférési szabályok mellett használható biztonságosan. Az anon kulcs nem titok, ezért önmagában nem jogosultságkezelés. Éles személyes adatot a demó-RLS ellenőrzése nélkül ne tölts fel.

## E-mail és külső naptár

A demó nem küld valódi e-mailt vagy SMS-t, és nem ír külső naptárba. A felületen interaktív előnézet és helyi naptárszimuláció működik. A `.env.example` tartalmazza a későbbi szerveroldali e-mail-adapterhez fenntartott változókat, de a kliens nem használja és nem jeleníti meg ezeket.

## Jogosultság és adatvédelem

A privát telepítés hozzáférését a hostingplatform szabályozza. A kezelőfelület jelszó nélküli demómód, nem kész, alkalmazásszintű hitelesítési rendszer. Éles pilot előtt szükséges:

- Supabase Auth vagy más támogatott hitelesítés;
- tulajdonosi és munkatársi jogosultság szerveroldali ellenőrzése;
- jogász által ellenőrzött adatkezelési tájékoztató;
- mentés, auditnapló, spamvédelem és fájlellenőrzés;
- normalizált ügyfél-, ajánlat- és eseménytáblák.

## Demóhasználat

1. A nyilvános oldalon küldj be fiktív ajánlatkérést.
2. Nyisd meg a „Demó kezelőfelületet”.
3. Kattints egy áttekintőkártyára a szűrt listához.
4. Készíts vagy módosíts ajánlatot.
5. Állítsd „Kiküldött” állapotba, majd nézd meg az e-mail-előnézetet és a létrejött utánkövetéseket.
6. Próbáld ki a Naptár és Munkanap menüpontot.
7. A Beállítások oldalon bármikor visszaállíthatod a fiktív adatokat.
