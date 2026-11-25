// Recording helpers. Chromium needs --force-device-scale-factor=2 for the
// screencast to come out at device pixels.
const { chromium } = require('playwright');
const { startCast } = require('./cast');
const fs = require('fs');
const BASE = 'https://fiscalizai-dev.vercel.app';
const launch = () => chromium.launch({ args: ['--force-device-scale-factor=2'] });
function marker(name, t0) {
  const ev = [];
  return { mark: (l) => { const t = (Date.now() / 1000 - t0).toFixed(2); ev.push([+t, l]); console.log(name, t, l); },
           save: () => fs.writeFileSync(`out/${name}.json`, JSON.stringify(ev)) };
}
async function open(b, name, kind, url, session, geo) {
  const opts = kind === 'mobile'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };
  const ctx = await b.newContext({ ...opts, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', ...(geo ? { geolocation: geo, permissions: ['geolocation'] } : {}) });
  if (session) await ctx.addInitScript((s) => { try { localStorage.setItem('fiscaliza.simulatorSession', s); } catch {} }, session);
  const p = await ctx.newPage();
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'input,textarea{caret-color:auto} *{-webkit-tap-highlight-color:transparent}' });
  await p.evaluate(() => document.querySelectorAll('input').forEach(i => i.spellcheck = false));
  await p.waitForTimeout(1500);
  const max = kind === 'mobile' ? [780, 1688] : [2560, 1600];
  const cast = await startCast(p, `out/${name}`, max);
  const m = marker(name, cast.t0); m.mark('ready');
  return { b, ctx, p, m, cast, name };
}
async function say(c, text) {
  const box = c.p.locator('input[placeholder="Mensagem"]');
  await box.click(); await c.p.evaluate(() => document.querySelectorAll('input').forEach(i => i.spellcheck = false));
  await box.pressSequentially(text, { delay: 40 });
  await c.p.waitForTimeout(350); c.m.mark('send:' + text.slice(0, 40));
  await c.p.click('button:has-text("Enviar")');
}
async function waitText(c, s, timeout = 90000) {
  await c.p.waitForFunction((s) => document.body.innerText.includes(s), s, { timeout });
  c.m.mark('got:' + s); await c.p.waitForTimeout(1500);
}
async function tap(c, locator, label) { c.m.mark('tap:' + label); await locator.click(); }
async function finish(c) { await c.p.waitForTimeout(800); await c.cast.stop(); c.m.save(); await c.ctx.close(); }
module.exports = { launch, BASE, open, say, waitText, tap, finish };
