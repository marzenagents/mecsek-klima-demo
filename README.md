# Mecsek Klíma – ajánlatkérő és utánkövető demó

Önálló, magyar nyelvű webalkalmazás-demó klíma- és hőszivattyú-szerelő vállalkozások számára. A rendszer minden megjelenített személyes és üzleti adata fiktív.

## Fő funkciók

- mobilbarát nyilvános kezdőoldal;
- ötlépéses, feltételes ajánlatkérő;
- helyi visszaigazolás- és időpontfoglalás-szimuláció;
- vállalkozói irányítópult;
- kereshető és szűrhető érdeklődőlista;
- módosítható státuszok, jegyzetek és eseményidővonal;
- mai, lejárt és következő heti feladatok;
- automatikus 3 és 7 napos ajánlat-utánkövetés;
- fiktív kimutatások és értékesítési folyamat;
- vezetett demóbemutató;
- böngészőben megmaradó adatok és visszaállítási lehetőség.

## Helyi futtatás

1. Telepíts legalább Node.js 22.13-as verziót.
2. A projekt mappájában futtasd: `npm ci`
3. Indítsd el: `npm run dev`
4. Nyisd meg a terminálban megjelenő helyi címet.

## Ellenőrzés

- Éles build: `npm run build`
- Automatizált teszt: `npm test`
- Kódellenőrzés: `npm run lint`

## Adatkezelés

A demó nem használ valódi háttérrendszert, nem küld e-mailt vagy SMS-t, és nem tölt fel fájlokat. Az űrlapadatokat az adott böngésző helyi tárhelyén tárolja. Éles használat előtt külön adatvédelmi, biztonsági és jogi felülvizsgálat szükséges.

## Környezeti változók

Az alapdemó külső szolgáltatás és API-kulcs nélkül működik. A `.env.example` csak a későbbi integrációk dokumentálására szolgál.
