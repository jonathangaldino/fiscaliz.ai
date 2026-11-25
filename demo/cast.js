// CDP screencast recorder: keeps device pixels (DSF 2) and real frame timing.
const fs = require('fs');
async function startCast(p, dir, max = [780, 1688]) {
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.context().newCDPSession(p);
  const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const file = `${dir}/f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push([file, f.metadata.timestamp]);
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1, maxWidth: max[0], maxHeight: max[1] });
  const t0 = Date.now() / 1000;
  return { t0, stop: async () => { try { await cdp.send('Page.stopScreencast'); } catch {}
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify({ t0, frames })); } };
}
module.exports = { startCast };
