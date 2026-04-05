const http = require('http');
const fs = require('fs');
const path = require('path');

function getApkFiles() {
  const dirs = [
    'app/build/outputs/apk/latestArm64/debug',
    'app/build/outputs/apk/lollipopX64/debug',
    'app/build/outputs/apk/latestUniversal/debug',
    'app/build/outputs/apk/latestUniversal/release',
  ];
  const found = [];
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.apk'));
      for (const f of files) {
        const stat = fs.statSync(path.join(dir, f));
        found.push({ name: f, size: (stat.size / 1024 / 1024).toFixed(1), dir });
      }
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('[getApkFiles]', dir, e.message);
    }
  }
  return found;
}

const server = http.createServer((req, res) => {
  const apks = getApkFiles();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ora - Android App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #17212b; color: #e2e8f0;
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 2rem;
    }
    .card { background: #232e3c; border-radius: 16px; padding: 2.5rem; max-width: 700px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .logo { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .logo-icon { width: 64px; height: 64px; background: linear-gradient(135deg, #2AABEE, #229ED9); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    h1 { font-size: 2rem; font-weight: 700; color: #fff; }
    .subtitle { color: #8a9bb3; font-size: 0.95rem; margin-top: 0.25rem; }
    .apk-item { background: #1a3a2a; border: 2px solid #2AEE6A; border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 0.75rem; }
    .apk-name { color: #7ee3a0; font-size: 1rem; font-weight: 700; }
    .apk-meta { color: #5f9a70; font-size: 0.82rem; margin-top: 0.25rem; }
    .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5f7a99; margin-bottom: 0.75rem; margin-top: 1.5rem; }
    .description { color: #aab8c8; line-height: 1.7; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
    .badge { background: #2a3a4d; border: 1px solid #3a5068; border-radius: 20px; padding: 0.3rem 0.9rem; font-size: 0.8rem; color: #7ec8e3; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .info-item { background: #1c2a38; border-radius: 10px; padding: 1rem; }
    .info-label { font-size: 0.75rem; color: #5f7a99; margin-bottom: 0.3rem; }
    .info-value { font-size: 0.95rem; color: #e2e8f0; font-weight: 500; }
    .install-steps { background: #1c2a38; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .step { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; align-items: flex-start; font-size: 0.88rem; color: #aab8c8; }
    .step:last-child { margin-bottom: 0; }
    .step-num { background: #2AABEE; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 0.1rem; }
    a.link-btn { background: #2AABEE; color: #fff; text-decoration: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">✈️</div>
      <div>
        <h1>Ora</h1>
        <div class="subtitle">Android App by BlusceLabs</div>
      </div>
    </div>

    <div class="section-title">Built APKs</div>
    ${apks.length > 0
      ? apks.map(a => `<div class="apk-item">
          <div class="apk-name">${a.name}</div>
          <div class="apk-meta">${a.size} MB &mdash; ${a.dir}</div>
        </div>`).join('')
      : '<div style="color:#5f7a99;font-size:.9rem;margin-bottom:1rem;">No APK found yet. Run the build first.</div>'
    }

    <div class="section-title">Installation</div>
    <div class="install-steps">
      <div class="step"><div class="step-num">1</div><div>Download the APK from the Replit file panel (navigate to the path shown above and right-click &rarr; Download)</div></div>
      <div class="step"><div class="step-num">2</div><div>Transfer it to your Android phone and open the file</div></div>
      <div class="step"><div class="step-num">3</div><div>Enable <strong>Install from unknown sources</strong> in Android Settings when prompted</div></div>
    </div>

    <div class="section-title">Project Info</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Version</div><div class="info-value">0.28.6 (1786)</div></div>
      <div class="info-item"><div class="info-label">Package ID</div><div class="info-value">com.bluscelabs.ora</div></div>
      <div class="info-item"><div class="info-label">Min SDK</div><div class="info-value">API 21 (Android 5.0)</div></div>
      <div class="info-item"><div class="info-label">Build System</div><div class="info-value">Gradle + CMake</div></div>
    </div>

    <div class="badge-row">
      <span class="badge">Java / Kotlin</span>
      <span class="badge">C / C++</span>
      <span class="badge">NDK 23.2</span>
      <span class="badge">CMake 3.22</span>
      <span class="badge">TDLib</span>
    </div>

    <a href="https://github.com/BlusceLabs/Ora" class="link-btn" target="_blank">GitHub</a>
  </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Ora project info server running on port 5000');
});
