# Attivazione: cosa serve dei tuoi account

Tutto quello che segue è già pronto nel progetto ma resta spento finché non fai
questi passaggi. Dove scrivo "chiedi a Claude", basta dirgli cosa hai ottenuto
(codice, nome del canale...) e fa la modifica lui.

## 1. Avvisi su Telegram

Ogni nuovo risultato arriva in un canale Telegram, con il link alla partita.

1. In Telegram cerca **@BotFather** e scrivi `/newbot`. Scegli un nome e un
   nome utente che finisce con `bot`. BotFather ti risponde con il **token**
   (una riga lunga con i due punti): copialo e tienilo segreto.
2. Crea un **canale pubblico** (Nuovo canale, tipo Pubblico) e scegli il nome
   del link, ad esempio `sportinglive_mestre`. L'indirizzo da usare sarà
   `@sportinglive_mestre`.
3. Nel canale: Amministratori, Aggiungi amministratore, cerca il tuo bot e
   confermalo (deve poter pubblicare messaggi).
4. Su GitHub apri il repository, poi **Settings, Secrets and variables,
   Actions, New repository secret**. Crea due segreti:
   - nome `TELEGRAM_TOKEN`, valore il token del punto 1;
   - nome `TELEGRAM_CHAT`, valore `@sportinglive_mestre` (il tuo canale).
5. Dal prossimo aggiornamento i nuovi risultati compaiono nel canale. Se più
   di 5 risultati arrivano insieme nello stesso girone, esce un solo riepilogo.

Per spegnere: cancella uno dei due segreti.

## 2. Statistiche di visita (GoatCounter)

Conta le pagine viste senza cookie e senza dati personali. Gratis.

1. Vai su **goatcounter.com** e premi Sign up.
2. Scegli un **codice** (ad esempio `sportinglive`): il tuo spazio sarà
   `sportinglive.goatcounter.com`. Inserisci email e password.
3. Scrivi il codice nel file `contenuti/config.json`:
   `{ "goatcounter": "sportinglive" }`. Chiedi a Claude, lo fa lui.
4. Le visite si leggono entrando nel tuo spazio su goatcounter.com.

## 3. Vantaggi (sponsor)

La voce "Vantaggi" compare nell'app solo quando c'è almeno un'offerta valida.
Le offerte stanno in `contenuti/vantaggi.json`. Esempio (i commenti qui sono
spiegazioni: nel file vero non vanno scritti):

```json
{
  "offerte": [
    {
      "id": "pizzeria-da-mario",          // nome breve, senza spazi, unico
      "sponsor": "Pizzeria Da Mario",
      "logo": "img/sponsor/da-mario.png", // il file del logo, vedi sotto
      "titolo": "Una bibita in omaggio",
      "descrizione": "Per chi gioca e per chi tifa.",
      "come": "Mostra la schermata dell'app alla cassa.",
      "validoFino": "2027-06-30",         // dopo questa data sparisce da sola
      "link": "https://www.esempio.it",
      "telefono": "041 1234567",
      "indirizzo": "Via Roma 1, Mestre"
    }
  ]
}
```

- Il **logo** va nella cartella `site/img/sponsor/` (PNG o JPG, meglio
  quadrato o largo, almeno 400 px). Il nome del file deve coincidere con
  `logo`.
- Puoi anche mandare a Claude i dati dello sponsor e il logo: prepara lui il
  file.

## 4. Dominio sportinglive.it

1. Compra `sportinglive.it` da un registrar (Aruba, Register, Namecheap...).
2. Nel pannello DNS del dominio crea questi record:
   - quattro record **A** sul dominio principale (`@`): `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153`;
   - quattro record **AAAA** (facoltativi): `2606:50c0:8000::153`,
     `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`;
   - se vuoi anche `www`: un record **CNAME** da `www` verso
     `max2staff.github.io`.
3. Nel repository crea il file `site/CNAME` con dentro una sola riga:
   `sportinglive.it`.
4. Cambia l'indirizzo del sito: `SITO_URL` in `scraper/config.py` e i due
   indirizzi `og:image` e `og:url` in `site/index.html`, tutti su
   `https://sportinglive.it/`. Chiedi a Claude, sono tre righe.
5. Su GitHub: **Settings, Pages, Custom domain**, scrivi `sportinglive.it` e
   Save. Quando il controllo DNS è verde (anche qualche ora), spunta
   **Enforce HTTPS**.

## 5. Stemmi e foto delle squadre

Facoltativi: dove mancano l'app mostra un segnaposto.

1. Trova l'**id** della squadra: apri la pagina della squadra nell'app, nel
   link in alto c'è `#/squadra/2480`: il numero (2480) è l'id.
2. **Stemma**: PNG quadrato, sfondo trasparente, almeno 256 px, salvato come
   `site/img/stemmi/<id>.png` (esempio `site/img/stemmi/2480.png`).
3. **Foto di squadra**: JPG largo 1200 px, salvato come
   `site/img/squadre/<id>.jpg`.
4. Basta passare i file a Claude con il nome della squadra: trova l'id e li
   mette al posto giusto.

## 6. Poster con il QR code

Il poster A4 da stampare (con il QR che porta al sito) si trova in
`docs/poster/`, file `poster-a4.png` e `poster-a4.pdf`. Se cambi dominio,
chiedi a Claude di rigenerarlo con il nuovo indirizzo.
