const http = require('http');
const fs = require('fs');
const path = require('path');

function getApkInfo() {
  const dirs = [
    'app/build/outputs/apk/lollipopX64/debug',
    'app/build/outputs/apk/latestUniversal/debug',
    'app/build/outputs/apk/latestUniversal/release',
  ];
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.apk'));
      if (files.length > 0) {
        const stat = fs.statSync(path.join(dir, files[0]));
        const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
        return { name: files[0], size: sizeMB, path: path.join(dir, files[0]) };
      }
    } catch (e) {}
  }
  return null;
}

const server = http.createServer((req, res) => {
  const apk = getApkInfo();

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
      background: #17212b;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #232e3c;
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 700px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .logo-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #2AABEE, #229ED9);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
    h1 { font-size: 2rem; font-weight: 700; color: #fff; }
    .subtitle { color: #8a9bb3; font-size: 0.95rem; margin-top: 0.25rem; }
    .description {
      color: #aab8c8;
      line-height: 1.7;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .badge {
      background: #2a3a4d;
      border: 1px solid #3a5068;
      border-radius: 20px;
      padding: 0.3rem 0.9rem;
      font-size: 0.8rem;
      color: #7ec8e3;
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #5f7a99;
      margin-bottom: 0.75rem;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .info-item {
      background: #1c2a38;
      border-radius: 10px;
      padding: 1rem;
    }
    .info-label { font-size: 0.75rem; color: #5f7a99; margin-bottom: 0.3rem; }
    .info-value { font-size: 0.95rem; color: #e2e8f0; font-weight: 500; }
    .apk-banner {
      background: #1a3a2a;
      border: 2px solid #2AEE6A;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      color: #7ee3a0;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .build-steps {
      background: #1c2a38;
      border-radius: 10px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .step {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      align-items: flex-start;
      font-size: 0.88rem;
      color: #aab8c8;
    }
    .step:last-child { margin-bottom: 0; }
    .step-num {
      background: #2AABEE;
      color: #fff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }
    .links { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .link-btn {
      background: #2AABEE;
      color: #fff;
      text-decoration: none;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .link-btn.secondary {
      background: #2a3a4d;
      border: 1px solid #3a5068;
      color: #aab8c8;
    }
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

    ${apk ? `<div class="apk-banner">✅ APK Built: ${apk.name} (${apk.size} MB)</div>` : ''}

    <p class="description">
      Ora is a native Android application by BlusceLabs.
      This is a <strong>native Android application</strong> — it cannot run as a web app.
    </p>

    <div class="badge-row">
      <span class="badge">Java / Kotlin</span>
      <span class="badge">C / C++</span>
      <span class="badge">Android SDK 36</span>
      <span class="badge">Gradle 9.2.1</span>
      <span class="badge">TDLib</span>
      <span class="badge">NDK 23.2</span>
      <span class="badge">CMake 3.22</span>
    </div>

    <div class="section-title">Project Info</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">App Version</div>
        <div class="info-value">0.28.6 (build 1786)</div>
      </div>
      <div class="info-item">
        <div class="info-label">Min SDK</div>
        <div class="info-value">API 21 (Android 5.0)</div>
      </div>
      <div class="info-item">
        <div class="info-label">Build System</div>
        <div class="info-value">Gradle + CMake</div>
      </div>
      <div class="info-item">
        <div class="info-label">Package ID</div>
        <div class="info-value">com.bluscelabs.ora</div>
      </div>
    </div>

    <div class="section-title">Build Instructions</div>
    <div class="build-steps">
      <div class="step">
        <div class="step-num">1</div>
        <div>Set <code>TELEGRAM_API_ID</code> and <code>TELEGRAM_API_HASH</code> environment variables</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div>Run: <code>bash scripts/build-ora.sh</code></div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div>APK output: <code>app/build/outputs/apk/</code></div>
      </div>
    </div>

    <div class="links">
      <a href="https://github.com/BlusceLabs/Ora" class="link-btn" target="_blank">GitHub</a>
    </div>
  </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Ora project info server running on port 5000');
});
