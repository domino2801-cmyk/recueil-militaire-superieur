/* Recueil Militaire Supérieur – application (vanilla JS, aucun framework, 100 % hors-ligne) */
(() => {
'use strict';

/* ---------- Utilitaires ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (n, d) => (d ? Math.round((100 * n) / d) : null);
const fmtDate = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/* ---------- Markdown minimal et sûr (échappe d'abord) ---------- */
function inline(t) {
  t = esc(t);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return t;
}
function md(src) {
  const lines = String(src ?? '').split('\n');
  const out = [];
  let list = null, para = [], table = [];
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)).map((r) => r.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => c.trim()));
    if (rows.length) {
      out.push('<div class="table-wrap"><table><thead><tr>' + rows[0].map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.slice(1).map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
    }
    table = [];
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*\|/.test(l)) { flushPara(); flushList(); table.push(l); continue; } else flushTable();
    let m;
    if (!l.trim()) { flushPara(); flushList(); continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { flushPara(); flushList(); const n = Math.min(m[1].length + 1, 4); out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if ((m = l.match(/^\s*[-*]\s+(.*)$/))) { flushPara(); if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { flushPara(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    flushList(); para.push(l.trim());
  }
  flushPara(); flushList(); flushTable();
  return '<div class="md">' + out.join('\n') + '</div>';
}

/* ---------- Stockage local ---------- */
const KEY = 'rms.v1';
const defaults = () => ({ results: [], dates: {}, docs: [], sport: [] });
let store;
function load() { try { store = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { store = defaults(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota ou mode privé */ } }

/* ---------- Données ---------- */
const D = {};
async function loadData() {
  const files = { exams: 'data/exams.json', library: 'data/library.json', qcm: 'data/qcm.json', sport: 'data/sport.json', calendar: 'data/calendar.json' };
  await Promise.all(Object.entries(files).map(async ([k, f]) => {
    const r = await fetch(f);
    if (!r.ok) throw new Error(f + ' : ' + r.status);
    D[k] = await r.json();
  }));
}
const exam = (id) => D.exams.exams.find((e) => e.id === id);
const subjectLabel = (id) => (D.qcm.subjects.find((s) => s.id === id) || {}).label || id;

/* ---------- Rendu ---------- */
const view = $('#view');
const crumbsEl = $('#crumbs');
function show(html, crumbs = [], nav = '') {
  view.innerHTML = html;
  crumbsEl.innerHTML = crumbs.map((c, i) => (c.href && i < crumbs.length - 1 ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`)).join(' › ');
  $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}

/* ---------- Accueil ---------- */
function vHome() {
  const total = store.results.length;
  const ok = store.results.filter((r) => r.correct).length;
  show(`
    <h1>Recueil Militaire Supérieur</h1>
    <p class="muted">Guichet unique de préparation : EMIA, ODS, BM2, BM4.</p>
    <div class="grid">
      ${D.exams.exams.map((e) => `<a class="card" href="#/epreuves/${e.id}"><h3>${esc(e.nom)}</h3><p class="muted">${esc(e.titre)}</p><span class="tag">${esc(e.autorite)}</span></a>`).join('')}
    </div>
    <h2>Accès rapide</h2>
    <div class="grid">
      <a class="card" href="#/entrainement/qcm"><h3>QCM</h3><p class="muted">Culture militaire, management, anglais</p></a>
      <a class="card" href="#/entrainement/sport"><h3>Simulateur sportif</h3><p class="muted">Luc Léger, natation</p></a>
      <a class="card" href="#/bibliotheque"><h3>Bibliothèque</h3><p class="muted">Textes, annales, rapports</p></a>
      <a class="card" href="#/progression"><h3>Progression</h3><p class="muted">${total ? `${pct(ok, total)} % de réussite (${total} réponses)` : 'Aucune réponse enregistrée'}</p></a>
    </div>
    <p class="notice">Les barèmes et textes fournis sont des squelettes à compléter avec les documents officiels en vigueur.</p>`, [{ label: 'Accueil' }], 'home');
}

/* ---------- Épreuves ---------- */
function vExamList() {
  show(`<h1>Fiches d'épreuves</h1><div class="grid">${D.exams.exams.map((e) => `
    <a class="card" href="#/epreuves/${e.id}"><h3>${esc(e.nom)}</h3><p class="muted">${esc(e.titre)}</p>
    <p>${esc(e.resume)}</p></a>`).join('')}</div>`, [{ label: 'Accueil', href: '#/' }, { label: 'Épreuves' }], 'epreuves');
}
function vExam(id) {
  const e = exam(id);
  if (!e) return vNotFound();
  const date = store.dates[id] || (D.calendar.exams[id] || {}).ecrits;
  show(`
    <h1>${esc(e.nom)} <span class="muted" style="font-weight:400;font-size:1rem">· ${esc(e.titre)}</span></h1>
    <p>${esc(e.resume)}</p>
    <p>${e.sources.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</p>
    ${date ? `<p><strong>Date des écrits :</strong> ${esc(fmtDate(new Date(date)))}</p>` : '<p class="muted">Date non renseignée (onglet Progression).</p>'}
    ${e.etapes.map((s, i) => `
      <details class="stage" ${i === 0 ? 'open' : ''}>
        <summary>${esc(s.titre)} ${s.verified ? '<span class="tag ok">vérifié</span>' : '<span class="tag warn">à vérifier</span>'}</summary>
        <div class="inner">
          ${md(s.corps)}
          ${s.epreuves && s.epreuves.length ? `<div class="table-wrap"><table><thead><tr><th>Épreuve</th><th>Durée</th><th>Coef.</th><th>Notes</th></tr></thead><tbody>
            ${s.epreuves.map((p) => `<tr><td>${esc(p.nom)}</td><td>${p.duree ? esc(p.duree) : '—'}</td><td>${p.coef ?? '—'}</td><td>${esc(p.notes || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>
      </details>`).join('')}
    <div class="row" style="margin-top:14px">
      <a class="btn alt" href="#/bibliotheque?exam=${id}" style="text-decoration:none;text-align:center;line-height:26px">Documents ${esc(e.nom)}</a>
      <a class="btn" href="#/entrainement/qcm?exam=${id}" style="text-decoration:none;text-align:center;line-height:26px">S'entraîner</a>
    </div>`, [{ label: 'Accueil', href: '#/' }, { label: 'Épreuves', href: '#/epreuves' }, { label: e.nom }], 'epreuves');
}

/* ---------- Bibliothèque ---------- */
function allDocs() { return [...D.library.documents, ...store.docs.map((d) => ({ ...d, local: true }))]; }
function vLibrary(q) {
  const fe = q.get('exam') || '', ft = q.get('type') || '', s = (q.get('s') || '').toLowerCase();
  const docs = allDocs().filter((d) => (!fe || d.exams.includes(fe)) && (!ft || d.type === ft) && (!s || (d.titre + ' ' + (d.reference || '')).toLowerCase().includes(s)));
  const typeLabel = (id) => (D.library.types.find((t) => t.id === id) || {}).label || id;
  show(`
    <h1>Bibliothèque</h1>
    <form id="libf" class="row">
      <div><label for="fe">Examen</label><select id="fe"><option value="">Tous</option>${D.exams.exams.map((e) => `<option value="${e.id}" ${fe === e.id ? 'selected' : ''}>${esc(e.nom)}</option>`).join('')}</select></div>
      <div><label for="ft">Type</label><select id="ft"><option value="">Tous</option>${D.library.types.map((t) => `<option value="${t.id}" ${ft === t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></div>
      <div><label for="fs">Recherche</label><input id="fs" type="search" value="${esc(q.get('s') || '')}"></div>
    </form>
    <div class="grid" style="margin-top:12px">
      ${docs.map((d) => `<a class="card" href="#/bibliotheque/${encodeURIComponent(d.id)}"><h3>${esc(d.titre)}</h3>
        <p><span class="tag">${esc(typeLabel(d.type))}</span>${d.exams.map((x) => `<span class="tag">${esc(x.toUpperCase())}</span>`).join('')}${d.local ? '<span class="tag warn">local</span>' : ''}</p>
        <p class="muted">${esc(d.emetteur || '')} ${d.reference ? '· ' + esc(d.reference) : ''}</p></a>`).join('') || '<p class="muted">Aucun document.</p>'}
    </div>
    <details class="stage"><summary>Ajouter un document (stocké sur cet appareil)</summary><div class="inner">
      <form id="addf">
        <label for="at">Titre</label><input id="at" required>
        <div class="row">
          <div><label for="ay">Type</label><select id="ay">${D.library.types.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select></div>
          <div><label for="ae">Examen</label><select id="ae">${D.exams.exams.map((e) => `<option value="${e.id}">${esc(e.nom)}</option>`).join('')}</select></div>
        </div>
        <label for="ar">Référence / émetteur</label><input id="ar">
        <label for="ac">Texte (Markdown)</label><textarea id="ac"></textarea>
        <p><button type="submit">Enregistrer</button></p>
      </form></div></details>`,
  [{ label: 'Accueil', href: '#/' }, { label: 'Bibliothèque' }], 'bibliotheque');
  const go = () => { const p = new URLSearchParams(); if ($('#fe').value) p.set('exam', $('#fe').value); if ($('#ft').value) p.set('type', $('#ft').value); if ($('#fs').value) p.set('s', $('#fs').value); location.hash = '#/bibliotheque' + (p.toString() ? '?' + p : ''); };
  ['fe', 'ft'].forEach((id) => $('#' + id).addEventListener('change', go));
  $('#libf').addEventListener('submit', (e) => { e.preventDefault(); go(); });
  $('#addf').addEventListener('submit', (e) => {
    e.preventDefault();
    store.docs.push({ id: 'local-' + Date.now(), exams: [$('#ae').value], type: $('#ay').value, titre: $('#at').value.trim(), emetteur: 'Ajout local', reference: $('#ar').value.trim(), corps: $('#ac').value });
    save(); vLibrary(new URLSearchParams());
  });
}
function vDoc(id) {
  const d = allDocs().find((x) => x.id === id);
  if (!d) return vNotFound();
  show(`<h1>${esc(d.titre)}</h1>
    <p>${d.exams.map((x) => `<span class="tag">${esc(x.toUpperCase())}</span>`).join('')} <span class="muted">${esc(d.emetteur || '')} ${d.reference ? '· ' + esc(d.reference) : ''} ${d.date ? '· ' + esc(d.date) : ''}</span></p>
    ${d.url && /^(https?:|docs\/)/.test(d.url) ? `<p><a class="btn" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Ouvrir le document source</a></p>` : ''}
    ${md(d.corps || '')}
    ${d.local ? '<p><button class="alt" id="deldoc">Supprimer ce document local</button></p>' : ''}`,
  [{ label: 'Accueil', href: '#/' }, { label: 'Bibliothèque', href: '#/bibliotheque' }, { label: d.titre }], 'bibliotheque');
  const b = $('#deldoc');
  if (b) b.addEventListener('click', () => { if (confirm('Supprimer ce document ?')) { store.docs = store.docs.filter((x) => x.id !== id); save(); location.hash = '#/bibliotheque'; } });
}

/* ---------- Entraînement ---------- */
function vTrainHub() {
  show(`<h1>Entraînement</h1><div class="grid">
    <a class="card" href="#/entrainement/qcm"><h3>Générateur de QCM</h3><p class="muted">Choisir matière, examen et nombre de questions.</p></a>
    <a class="card" href="#/entrainement/sport"><h3>Simulateur de barèmes sportifs</h3><p class="muted">Luc Léger, natation.</p></a></div>`,
  [{ label: 'Accueil', href: '#/' }, { label: 'Entraînement' }], 'entrainement');
}
let quiz = null;
function vQcmSetup(q) {
  const fe = q.get('exam') || '';
  show(`<h1>Générateur de QCM</h1>
    <form id="qf">
      <label for="qs">Matière</label>
      <select id="qs"><option value="">Toutes</option>${D.qcm.subjects.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select>
      <label for="qe">Examen</label>
      <select id="qe"><option value="">Tous</option>${D.exams.exams.map((e) => `<option value="${e.id}" ${fe === e.id ? 'selected' : ''}>${esc(e.nom)}</option>`).join('')}</select>
      <label for="qn">Nombre de questions</label>
      <select id="qn"><option>5</option><option selected>10</option><option>20</option></select>
      <p><button type="submit">Commencer</button></p>
    </form><p class="muted">${D.qcm.questions.length} questions dans la base. Enrichissez data/qcm.json.</p>`,
  [{ label: 'Accueil', href: '#/' }, { label: 'Entraînement', href: '#/entrainement' }, { label: 'QCM' }], 'entrainement');
  $('#qf').addEventListener('submit', (e) => {
    e.preventDefault();
    const s = $('#qs').value, x = $('#qe').value, n = +$('#qn').value;
    const pool = D.qcm.questions.filter((k) => (!s || k.subject === s) && (!x || k.exams.includes(x)));
    if (!pool.length) { alert('Aucune question pour ce filtre.'); return; }
    quiz = { qs: shuffle(pool).slice(0, n), i: 0, score: 0, exam: x, answered: false };
    vQuiz();
  });
}
function vQuiz() {
  if (!quiz) return (location.hash = '#/entrainement/qcm');
  const crumbs = [{ label: 'Accueil', href: '#/' }, { label: 'Entraînement', href: '#/entrainement' }, { label: 'QCM' }];
  if (quiz.i >= quiz.qs.length) {
    show(`<h1>Terminé</h1><p class="big">${quiz.score} / ${quiz.qs.length}</p><p>${pct(quiz.score, quiz.qs.length)} % de réussite.</p>
      <p><a class="btn" href="#/entrainement/qcm" style="text-decoration:none">Nouvelle série</a> <a class="btn alt" href="#/progression" style="text-decoration:none">Voir la progression</a></p>`, crumbs, 'entrainement');
    quiz = null; return;
  }
  const k = quiz.qs[quiz.i];
  show(`<p class="muted">Question ${quiz.i + 1} / ${quiz.qs.length} · ${esc(subjectLabel(k.subject))}</p>
    <h2 style="margin-top:.2em">${esc(k.q)}</h2>
    <div id="choices">${k.choices.map((c, j) => `<button class="choice" data-j="${j}">${esc(c)}</button>`).join('')}</div>
    <div id="fb"></div>`, crumbs, 'entrainement');
  $$('#choices .choice').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.j)));
}
function answer(j) {
  if (quiz.answered) return;
  quiz.answered = true;
  const k = quiz.qs[quiz.i], good = j === k.answer;
  if (good) quiz.score++;
  store.results.push({ ts: Date.now(), subject: k.subject, exam: quiz.exam || '', correct: good });
  save();
  $$('#choices .choice').forEach((b, idx) => { b.disabled = true; if (idx === k.answer) b.classList.add('right'); else if (idx === j) b.classList.add('wrong'); });
  $('#fb').innerHTML = `<p><strong>${good ? 'Correct.' : 'Incorrect.'}</strong> ${esc(k.explain || '')}</p><p><button id="next">${quiz.i + 1 >= quiz.qs.length ? 'Résultat' : 'Suivante'}</button></p>`;
  $('#next').addEventListener('click', () => { quiz.i++; quiz.answered = false; vQuiz(); });
  $('#next').focus();
}

/* Simulateur sportif */
function gradePoints(test, examId, value) {
  const grid = test.grilles[examId] || test.grilles.default;
  if (test.direction === 'higher') { for (const g of grid) if (value >= g.seuil) return g.points; }
  else { for (const g of grid) if (value <= g.seuil) return g.points; }
  return 0;
}
function vSport() {
  show(`<h1>Simulateur de barèmes sportifs</h1>
    <p class="notice">${D.sport.official ? '' : 'Barèmes d\'exemple, non officiels : remplacez-les dans data/sport.json par ceux de la notice en vigueur.'}</p>
    <form id="sf">
      <label for="se">Examen</label>
      <select id="se">${D.exams.exams.map((e) => `<option value="${e.id}">${esc(e.nom)}</option>`).join('')}</select>
      ${D.sport.tests.map((t) => `<label for="t-${t.id}">${esc(t.nom)} (${esc(t.unite)})</label><input id="t-${t.id}" type="number" inputmode="decimal" min="0" step="${t.pas || 1}" placeholder="—">`).join('')}
      <p><button type="submit">Calculer</button></p>
    </form><div id="sres"></div>
    ${store.sport.length ? `<h2>Historique</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Examen</th><th>Épreuve</th><th>Perf.</th><th>Points</th></tr></thead><tbody>${store.sport.slice(-10).reverse().map((r) => `<tr><td>${esc(fmtDate(new Date(r.ts)))}</td><td>${esc(r.exam.toUpperCase())}</td><td>${esc(r.test)}</td><td>${esc(r.value)}</td><td>${esc(r.points)}</td></tr>`).join('')}</tbody></table></div>` : ''}`,
  [{ label: 'Accueil', href: '#/' }, { label: 'Entraînement', href: '#/entrainement' }, { label: 'Sport' }], 'entrainement');
  $('#sf').addEventListener('submit', (e) => {
    e.preventDefault();
    const ex = $('#se').value; let rows = '', sum = 0, n = 0;
    D.sport.tests.forEach((t) => {
      const v = $('#t-' + t.id).value;
      if (v === '') return;
      const val = parseFloat(v), pts = gradePoints(t, ex, val);
      sum += pts; n++;
      store.sport.push({ ts: Date.now(), exam: ex, test: t.nom, value: val + ' ' + t.unite, points: pts });
      rows += `<tr><td>${esc(t.nom)}</td><td>${val} ${esc(t.unite)}</td><td><strong>${pts} / 20</strong></td></tr>`;
    });
    if (!n) { $('#sres').innerHTML = '<p class="muted">Saisissez au moins une performance.</p>'; return; }
    save();
    $('#sres').innerHTML = `<h2>Résultat</h2><div class="table-wrap"><table><thead><tr><th>Épreuve</th><th>Performance</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div><p>Moyenne : <strong>${(sum / n).toFixed(1)} / 20</strong></p>`;
  });
}

/* ---------- Progression & planning ---------- */
function stats() {
  const by = {};
  D.qcm.subjects.forEach((s) => { by[s.id] = { n: 0, ok: 0 }; });
  store.results.forEach((r) => { (by[r.subject] ||= { n: 0, ok: 0 }); by[r.subject].n++; if (r.correct) by[r.subject].ok++; });
  return by;
}
function buildPlan(dateStr) {
  const end = new Date(dateStr + 'T00:00:00'), start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Math.ceil((end - start) / 864e5);
  if (isNaN(days) || days < 1) return null;
  const by = stats();
  const ranked = Object.keys(by).sort((a, b) => ((by[a].n ? by[a].ok / by[a].n : -1) - (by[b].n ? by[b].ok / by[b].n : -1)));
  const weeks = Math.ceil(days / 7), plan = [];
  for (let w = 0; w < weeks; w++) {
    const ws = new Date(start.getTime() + w * 7 * 864e5), we = new Date(Math.min(ws.getTime() + 6 * 864e5, end.getTime()));
    const remaining = weeks - w;
    const phase = remaining <= 2 ? 'Révision finale' : remaining <= 6 ? 'Consolidation' : 'Acquisition';
    const focus = [...new Set([ranked[0], ranked[1], ranked[w % ranked.length]].filter(Boolean))];
    const tasks = phase === 'Révision finale'
      ? ['Annales et sujets blancs en conditions réelles', 'QCM ciblés sur les points faibles', 'Entretien physique, sommeil, logistique du jour J']
      : phase === 'Consolidation'
        ? ['2 séries de QCM par matière faible', 'Relecture des textes de la bibliothèque', '2 séances sportives avec test chronométré']
        : ['Lecture des textes réglementaires et fiches d\'épreuves', '1 série de QCM par matière', '2 séances sportives (endurance, natation)'];
    plan.push({ ws, we, phase, focus, tasks, remaining });
  }
  return plan;
}
function vProgress() {
  const by = stats(), total = store.results.length, ok = store.results.filter((r) => r.correct).length;
  const dates = D.exams.exams.map((e) => ({ e, d: store.dates[e.id] || (D.calendar.exams[e.id] || {}).ecrits || '' }));
  show(`
    <h1>Progression</h1>
    <div class="card"><span class="big">${total ? pct(ok, total) + ' %' : '—'}</span> <span class="muted">de réussite globale (${total} réponse${total > 1 ? 's' : ''})</span></div>
    <h2>Taux de réussite par matière</h2>
    ${Object.entries(by).map(([id, s]) => { const p = pct(s.ok, s.n); return `<div class="stat"><span>${esc(subjectLabel(id))}</span><span>${p === null ? 'aucune réponse' : p + ' % (' + s.ok + '/' + s.n + ')'}</span></div><div class="bar" role="img" aria-label="${esc(subjectLabel(id))} : ${p ?? 0} %"><i class="${p !== null && p >= 70 ? 'good' : p !== null && p < 50 ? 'low' : ''}" style="width:${p ?? 0}%"></i></div>`; }).join('')}
    <h2>Dates officielles</h2>
    <p class="muted">Saisir la date des écrits (ou de l'épreuve principale) d'après l'arrêté ou la note en vigueur.</p>
    <div class="row">${dates.map(({ e, d }) => `<div><label for="d-${e.id}">${esc(e.nom)}</label><input type="date" id="d-${e.id}" data-ex="${e.id}" value="${esc(d)}"></div>`).join('')}</div>
    <h2>Planning de révision rétroactif</h2>
    <label for="pe">Examen visé</label>
    <select id="pe">${dates.map(({ e, d }) => `<option value="${e.id}" ${d ? '' : 'disabled'}>${esc(e.nom)}${d ? '' : ' (date requise)'}</option>`).join('')}</select>
    <p><button id="mkplan">Générer le planning</button></p>
    <div id="plan"></div>
    <h2>Données</h2>
    <p><button class="alt" id="exp">Exporter</button> <button class="alt" id="rst">Réinitialiser la progression</button></p>`,
  [{ label: 'Accueil', href: '#/' }, { label: 'Progression' }], 'progression');
  $$('input[type=date]').forEach((i) => i.addEventListener('change', () => { if (i.value) store.dates[i.dataset.ex] = i.value; else delete store.dates[i.dataset.ex]; save(); vProgress(); }));
  $('#mkplan').addEventListener('click', () => {
    const id = $('#pe').value, d = store.dates[id] || (D.calendar.exams[id] || {}).ecrits;
    const plan = d ? buildPlan(d) : null;
    $('#plan').innerHTML = plan ? plan.map((p) => `<div class="week"><strong>${esc(fmtDate(p.ws))} → ${esc(fmtDate(p.we))}</strong> <span class="tag">${esc(p.phase)}</span><br>
      <span class="muted">Priorités : ${p.focus.map((f) => esc(subjectLabel(f))).join(', ')}</span><ul>${p.tasks.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('') : '<p class="muted">Date absente ou déjà passée.</p>';
  });
  $('#exp').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }));
    a.download = 'rms-progression.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#rst').addEventListener('click', () => { if (confirm('Effacer résultats et historique sportif (les dates et documents locaux sont conservés) ?')) { store.results = []; store.sport = []; save(); vProgress(); } });
}

function vNotFound() { show('<h1>Page introuvable</h1><p><a href="#/">Retour à l\'accueil</a></p>', [{ label: 'Accueil', href: '#/' }]); }

/* ---------- Routage ---------- */
function route() {
  if (!D.exams) return;
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = new URLSearchParams(qs || '');
  const p = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (!p.length) return vHome();
  if (p[0] === 'epreuves') return p[1] ? vExam(p[1]) : vExamList();
  if (p[0] === 'bibliotheque') return p[1] ? vDoc(p[1]) : vLibrary(q);
  if (p[0] === 'entrainement') { if (p[1] === 'qcm') return quiz ? vQuiz() : vQcmSetup(q); if (p[1] === 'sport') return vSport(); return vTrainHub(); }
  if (p[0] === 'progression') return vProgress();
  return vNotFound();
}

/* ---------- Démarrage ---------- */
function netState() { const n = $('#net'); n.textContent = navigator.onLine ? 'En ligne' : 'Hors-ligne'; n.classList.toggle('off', !navigator.onLine); }
window.addEventListener('online', netState);
window.addEventListener('offline', netState);
window.addEventListener('hashchange', route);
(async () => {
  load(); netState();
  try { await loadData(); route(); }
  catch (e) { view.innerHTML = `<p class="notice">Impossible de charger les données (${esc(e.message)}). Ouvrez l'application via un serveur (http://localhost) et non en file://.</p>`; }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
})();
