const http = require('http');

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
      transition: background 0.2s;
    }
    .link-btn:hover { background: #229ED9; }
    .link-btn.secondary {
      background: #2a3a4d;
      border: 1px solid #3a5068;
      color: #aab8c8;
    }
    .link-btn.secondary:hover { background: #334a62; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">✈️</div>
      <div>
        <h1>Ora</h1>
        <div class="subtitle">Telegram Client for Android by BlusceLabs</div>
      </div>
    </div>

    <p class="description">
      Ora is a slick, experimental Android client for Telegram based on TDLib.
      This is a <strong>native Android application</strong> requiring Android SDK and NDK to build.
      It cannot be run directly as a web application.
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
        <div class="info-value">0.x (build 1786)</div>
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
        <div>Clone with submodules: <code>git clone --recursive --depth=1 https://github.com/TGX-Android/Telegram-X tgx</code></div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div>Obtain Telegram API credentials at <strong>core.telegram.org/api/obtaining_api_id</strong> and create <code>local.properties</code> with <code>sdk.dir</code>, <code>telegram.api_id</code>, and <code>telegram.api_hash</code></div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div>Run <code>scripts/setup.sh</code> to download Android SDK packages and build native dependencies</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div>Build with <code>./gradlew assembleUniversalRelease</code> or open in Android Studio</div>
      </div>
    </div>

    <div class="links">
      <a href="https://play.google.com/store/apps/details?id=org.thunderdog.challegram" class="link-btn" target="_blank">Google Play</a>
      <a href="https://github.com/BlusceLabs/Ora" class="link-btn secondary" target="_blank">GitHub</a>
      <a href="https://t.me/tgx_log" class="link-btn secondary" target="_blank">Build Logs</a>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Ora project info server running on port 5000');
});
