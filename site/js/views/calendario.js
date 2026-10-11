import { esc, formattaData, formattaDataLunga } from '../util.js';
import { giornate, giornataIniziale, partiteGiornata, senzaGiornata, separaRiposo, DA_DEFINIRE_G } from '../calendario.js';
import { squadraReale } from '../evidenza.js';
import { rigaPartita, vuoto, nomeSquadra } from './comuni.js';

// Scheda "Calendario" del girone: una giornata alla volta, frecce e menu a tendina.
export function calendarioHTML(g, indice, param, oggi) {
  const { partite: tutte, riposa } = separaRiposo(g.partite, (g.squadre || []).filter(s => !squadraReale(s)).map(s => s.id));
  const gg = giornate(tutte);
  const extra = senzaGiornata(tutte);
  const voci = [...gg.map(String), ...(extra.length ? [DA_DEFINIRE_G] : [])];
  if (!voci.length) return vuoto('Calendario non ancora pubblicato.');
  const scelto = voci.includes(String(param)) ? String(param) : String(giornataIniziale(tutte, oggi) ?? voci[0]);
  const i = voci.indexOf(scelto);
  const base = `#/classifiche/${esc(g.slug)}/calendario/`;
  const nome = (v) => (v === DA_DEFINIRE_G ? 'Da definire' : `${v}ª giornata`);
  const partite = scelto === DA_DEFINIRE_G ? extra : partiteGiornata(tutte, Number(scelto));
  const riposo = scelto === DA_DEFINIRE_G ? [] : riposa.filter(r => r.giornata === Number(scelto));
  const date = [...new Set(partite.map(p => p.data).filter(Boolean))].sort();
  const sotto = date.length === 1 ? formattaDataLunga(date[0]) : date.length ? `dal ${formattaData(date[0])} al ${formattaData(date[date.length - 1])}` : '';
  const freccia = (j, s, et) => (j >= 0 && j < voci.length ? `<a class="freccia" href="${base}${voci[j]}" aria-label="${et}">${s}</a>` : `<span class="freccia off" aria-hidden="true">${s}</span>`);
  return `<div class="giorno cal-giornata">
      ${freccia(i - 1, '‹', 'giornata precedente')}
      <label class="titolo"><span>${esc(nome(scelto))}</span>${sotto ? `<small>${esc(sotto)}</small>` : ''}
        <select aria-label="Scegli la giornata">${voci.map(v => `<option value="${v}" ${v === scelto ? 'selected' : ''}>${esc(nome(v))}</option>`).join('')}</select>
      </label>
      ${freccia(i + 1, '›', 'giornata successiva')}
    </div>
    <section class="card piena">${partite.length ? partite.map(p => rigaPartita(p, indice, { mostraData: true })).join('') : '<p class="muto">Nessuna partita.</p>'}
      ${riposo.length ? `<p class="cal-riposo muto">Riposa: ${riposo.map(r => `<a href="#/squadra/${Number(r.squadraId)}">${esc(nomeSquadra(indice, r.squadraId))}</a>`).join(', ')}</p>` : ''}</section>`;
}

export function collegaCalendario(root, ctx, slug) {
  const sel = root.querySelector('.cal-giornata select');
  if (sel) sel.onchange = () => ctx.naviga(`#/classifiche/${slug}/calendario/${sel.value}`);
}
