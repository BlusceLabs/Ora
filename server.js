const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = '/tmp/gradle_build.log';
let buildStatus = 'STARTING';
let buildProcess = null;

function startGradleBuild() {
  if (buildProcess) return;

  fs.writeFileSync(LOG_FILE, '');
  buildStatus = 'RUNNING';

  const env = {
    ...process.env,
    JAVA_HOME: '/nix/store/2ds1jrzlmx4n08sp7flga5sxf000l2sl-zulu-ca-jdk-21.0.4',
    PATH: '/nix/store/2ds1jrzlmx4n08sp7flga5sxf000l2sl-zulu-ca-jdk-21.0.4/bin:' +
          '/home/runner/Android/Sdk/cmake/3.22.1/bin:' + process.env.PATH
  };

  buildProcess = spawn('./gradlew', ['assembleLollipopX64Debug', '--no-daemon'], {
    cwd: '/home/runner/workspace',
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  buildProcess.stdout.pipe(logStream);
  buildProcess.stderr.pipe(logStream);

  buildProcess.on('close', (code) => {
    buildStatus = code === 0 ? 'SUCCESS' : `FAILED (exit ${code})`;
    fs.appendFileSync(LOG_FILE, `\n\nBUILD_EXIT_CODE=${code}\n`);
    buildProcess = null;
  });

  console.log('Gradle build started, PID:', buildProcess.pid);
}

function getLog() {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = data.split('\n');
    return lines.slice(-50).join('\n');
  } catch (e) {
    return 'No log yet.';
  }
}

function getApkStatus() {
  const apkDir = '/home/runner/workspace/app/build/outputs/apk/lollipopX64/debug';
  try {
    const files = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
    if (files.length > 0) {
      const stat = fs.statSync(path.join(apkDir, files[0]));
      const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
      return `APK READY: ${files[0]} (${sizeMB} MB)`;
    }
  } catch (e) {}
  return null;
}

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #17212b; color: #e2e8f0;
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start; padding: 2rem;
  }
  .card {
    background: #232e3c; border-radius: 16px; padding: 2rem;
    max-width: 800px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    margin-bottom: 1.5rem;
  }
  .logo { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
  .logo-icon {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, #2AABEE, #229ED9);
    border-radius: 14px; display: flex; align-items: center;
    justify-content: center; font-size: 1.8rem;
  }
  h1 { font-size: 1.8rem; font-weight: 700; color: #fff; }
  .subtitle { color: #8a9bb3; font-size: 0.9rem; margin-top: 0.2rem; }
  .status-banner {
    padding: 0.8rem 1.2rem; border-radius: 10px; font-weight: 600;
    font-size: 0.95rem; margin-bottom: 1.5rem;
  }
  .status-running { background: #1a3a5c; color: #7ec8e3; border: 1px solid #2AABEE; }
  .status-success { background: #1a3a2a; color: #7ee3a0; border: 1px solid #2AEE6A; }
  .status-failed { background: #3a1a1a; color: #e37e7e; border: 1px solid #ee2a2a; }
  .log-box {
    background: #0d1a24; border-radius: 10px; padding: 1rem;
    font-family: monospace; font-size: 0.78rem; color: #8aafc8;
    max-height: 400px; overflow-y: auto; white-space: pre-wrap;
    word-break: break-all;
  }
  .section-title {
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #5f7a99; margin-bottom: 0.75rem;
  }
  .apk-banner {
    background: #1a3a2a; border: 2px solid #2AEE6A; border-radius: 12px;
    padding: 1.2rem 1.5rem; color: #7ee3a0; font-size: 1.1rem;
    font-weight: 700; margin-bottom: 1.5rem; text-align: center;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
  .info-item { background: #1c2a38; border-radius: 10px; padding: 1rem; }
  .info-label { font-size: 0.72rem; color: #5f7a99; margin-bottom: 0.3rem; }
  .info-value { font-size: 0.9rem; color: #e2e8f0; font-weight: 500; }
  a { color: #2AABEE; }
`;

const server = http.createServer((req, res) => {
  const apk = getApkStatus();
  const log = getLog();
  const statusClass = buildStatus === 'SUCCESS' ? 'status-success'
    : buildStatus.startsWith('FAILED') ? 'status-failed' : 'status-running';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="10">
  <title>Ora APK Build</title>
  <style>${css}</style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">✈️</div>
      <div>
        <h1>Ora</h1>
        <div class="subtitle">Android App by BlusceLabs · Build Monitor</div>
      </div>
    </div>

    ${apk ? `<div class="apk-banner">🎉 ${apk}</div>` : ''}

    <div class="status-banner ${statusClass}">
      Build Status: ${buildStatus}
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Target</div>
        <div class="info-value">assembleLollipopX64Debug</div>
      </div>
      <div class="info-item">
        <div class="info-label">Package ID</div>
        <div class="info-value">com.bluscelabs.ora</div>
      </div>
      <div class="info-item">
        <div class="info-label">ABI</div>
        <div class="info-value">x86_64</div>
      </div>
      <div class="info-item">
        <div class="info-label">GitHub</div>
        <div class="info-value"><a href="https://github.com/BlusceLabs/Ora" target="_blank">BlusceLabs/Ora</a></div>
      </div>
    </div>

    <div class="section-title">Build Log (last 50 lines)</div>
    <div class="log-box">${log.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Ora build monitor running on port 5000');
  startGradleBuild();
});
