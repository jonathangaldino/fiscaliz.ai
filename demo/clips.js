// Records each scene of the demo against the dev environment.
// Usage: node clips.js A|B|C|D|F|G|H|B2   (frames go to out/<name>/)
// Each run with a new simulator session is a new citizen; A, B and C create
// reports in dev, so run them once, in order (G verifies A's report).
const L = require('./lib'); const fs = require('fs');
const which = process.argv[2];
const PT = [215, 250]; // map tap for the photo pothole (B)
async function clipA(b) { // citizen report with a typo in the street
  const c = await L.open(b, 'A_report', 'mobile', '/simular');
  await L.say(c, 'o poste da minha rua tá apagado faz uma semana, fica um breu à noite');
  await L.waitText(c, 'Onde fica');
  await L.say(c, 'avenida curitba, 1200');
  await L.waitText(c, 'Posso registrar'); await c.p.waitForTimeout(2500);
  await L.tap(c, c.p.locator('button:has-text("SIM")').last(), 'SIM');
  await L.waitText(c, 'Relato registrado'); await c.p.waitForTimeout(3000);
  const link = await c.p.locator('a[href*="/ocorrencias/"]').last().getAttribute('href');
  const session = await c.p.evaluate(() => localStorage.getItem('fiscaliza.simulatorSession'));
  fs.writeFileSync('out/A_meta.json', JSON.stringify({ link, session }));
  await L.finish(c);
}
async function clipB(b) { // photo, anonymized
  const c = await L.open(b, 'B_photo', 'mobile', '/simular');
  await L.say(c, 'tem um buraco enorme aqui na rua, quase caí de bicicleta');
  await L.waitText(c, 'Onde fica');
  c.m.mark('attach'); await c.p.setInputFiles('input[type=file]', 'foto-buraco.jpg');
  await L.waitText(c, 'Recebi a foto');
  c.m.mark('tap:map'); await c.p.mouse.click(...PT); await c.p.waitForTimeout(1200);
  await L.tap(c, c.p.locator('button:has-text("Enviar localização")'), 'send-location');
  await L.waitText(c, 'Posso registrar'); await c.p.waitForTimeout(2500);
  await L.tap(c, c.p.locator('button:has-text("SIM")').last(), 'SIM');
  await L.waitText(c, 'Relato registrado');
  await L.waitText(c, 'Foto publicada', 120000); await c.p.waitForTimeout(1500);
  const link = await c.p.locator('a[href*="/ocorrencias/"]').last().getAttribute('href');
  fs.writeFileSync('out/B_meta.json', JSON.stringify({ link }));
  await L.finish(c);
}
async function clipB2(b) { // the anonymized photo on the occurrence page
  const meta = JSON.parse(fs.readFileSync('out/B_meta.json'));
  const c = await L.open(b, 'B2_photo_page', 'mobile', new URL(meta.link).pathname);
  await c.p.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) { await c.p.mouse.wheel(0, 30); await c.p.waitForTimeout(60); }
  c.m.mark('photo'); await c.p.waitForTimeout(4000);
  await L.finish(c);
}
async function clipC(b) { // same pothole from another citizen; desktop map records alongside
  const d = await L.open(b, 'E_map_live', 'desktop', '/mapa');
  // Geolocation at B's pothole (from /api/ocorrencias.geojson) so "my location" lands next to it.
  const c = await L.open(b, 'C_dedup', 'mobile', '/simular', null, { latitude: -23.537266081703905, longitude: -51.459083386230276 });
  await L.say(c, 'buracão na rua, perigoso pra quem passa de moto');
  await L.waitText(c, 'Onde fica');
  await L.tap(c, c.p.locator('button[aria-label="Ir para a minha localização"]'), 'locate'); await c.p.waitForTimeout(2500);
  await c.p.mouse.move(120, 300); await c.p.mouse.down(); await c.p.mouse.move(120, 78, { steps: 15 }); await c.p.mouse.up();
  await c.p.waitForTimeout(1500);
  c.m.mark('tap:map'); await c.p.mouse.click(203, 212); await c.p.waitForTimeout(1200);
  await L.tap(c, c.p.locator('button:has-text("Enviar localização")'), 'send-location');
  await L.waitText(c, 'Posso registrar'); await c.p.waitForTimeout(2500);
  await L.tap(c, c.p.locator('button:has-text("SIM")').last(), 'SIM');
  await L.waitText(c, 'pessoas pedindo'); d.m.mark('appeal-added'); await c.p.waitForTimeout(3500);
  await L.finish(c);
  await d.p.waitForTimeout(2000); await L.finish(d);
}
async function clipD(b) { // guardrails: nothing is stored
  const c = await L.open(b, 'D_guard', 'mobile', '/simular');
  await L.say(c, 'caiu uma árvore em cima dos fios aqui na rua');
  await L.waitText(c, 'não registrou'); await c.p.waitForTimeout(2000);
  await L.say(c, 'tá vazando água no meio da rua faz dois dias');
  await L.waitText(c, 'Sanepar'); await c.p.waitForTimeout(3000);
  await L.finish(c);
}
async function clipF(b) { // desktop: map filters, agency queue, reliability, open data
  const c = await L.open(b, 'F_city', 'desktop', '/mapa');
  await c.p.waitForTimeout(2000);
  const chip = c.p.locator('button:has-text("Buracos")').first();
  if (await chip.count()) { await L.tap(c, chip, 'chip-buracos'); await c.p.waitForTimeout(3000); }
  const search = c.p.locator('input[placeholder^="Buscar"]').first();
  await search.click(); await search.pressSequentially('curitiba', { delay: 70 }); c.m.mark('search'); await c.p.waitForTimeout(3000);
  await search.fill(''); await c.p.waitForTimeout(800);
  const meta = JSON.parse(fs.readFileSync('out/B_meta.json'));
  c.m.mark('goto-occurrence'); await c.p.goto(meta.link, { waitUntil: 'networkidle' }); await c.p.waitForTimeout(3000);
  const q = c.p.locator('a:has-text("Ver fila do órgão")');
  await q.scrollIntoViewIfNeeded(); await c.p.waitForTimeout(1000);
  await L.tap(c, q, 'agency-queue'); await c.p.waitForLoadState('networkidle'); await c.p.waitForTimeout(3500);
  await c.p.mouse.wheel(0, 400); await c.p.waitForTimeout(2500);
  c.m.mark('reliability'); await c.p.goto(L.BASE + '/confiabilidade', { waitUntil: 'networkidle' }); await c.p.waitForTimeout(3500);
  for (let i = 0; i < 6; i++) { await c.p.mouse.wheel(0, 260); await c.p.waitForTimeout(700); }
  await c.p.waitForTimeout(1500);
  c.m.mark('geojson'); await c.p.goto(L.BASE + '/api/ocorrencias.geojson', { waitUntil: 'networkidle' }); await c.p.waitForTimeout(3000);
  await L.finish(c);
}
async function clipG(b) { // verification closes the loop on A's report
  const meta = JSON.parse(fs.readFileSync('out/A_meta.json'));
  const d = await L.open(b, 'G_verify_desk', 'desktop', new URL(meta.link).pathname);
  const c = await L.open(b, 'G_verify_phone', 'mobile', '/simular', meta.session);
  await d.p.waitForTimeout(1500);
  await L.tap(d, d.p.locator('button:has-text("Iniciar verificação")'), 'start-verification');
  c.m.mark('started');
  await c.p.waitForFunction(() => /já foi resolvido\?/.test(document.body.innerText), null, { timeout: 60000 });
  await c.p.waitForTimeout(2500); c.m.mark('question');
  await L.tap(c, c.p.locator('button:has-text("SIM")').last(), 'SIM');
  await c.p.waitForTimeout(4000);
  d.m.mark('desk-after'); await d.p.waitForTimeout(3000);
  await L.finish(c);
  d.m.mark('goto-resolved'); await d.p.goto(L.BASE + '/resolvidas', { waitUntil: 'networkidle' }); await d.p.waitForTimeout(4000);
  await L.finish(d);
}
async function clipH(b) { // responsive: the map on the phone
  const c = await L.open(b, 'H_phone_map', 'mobile', '/mapa');
  await c.p.waitForTimeout(5000);
  await L.finish(c);
}
(async () => {
  const b = await L.launch();
  try { await ({ A: clipA, B: clipB, B2: clipB2, C: clipC, D: clipD, F: clipF, G: clipG, H: clipH })[which](b); }
  catch (e) { console.error('FAIL', which, e.message); process.exitCode = 1; }
  await b.close();
})();
