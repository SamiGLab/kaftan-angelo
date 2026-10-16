export async function launchLighthouseBrowser({ executablePath, launch, ci }) {
  const chromePath = await executablePath();
  if (typeof chromePath !== 'string' || !chromePath) throw Error('Browser executable path is unavailable');
  const chromeFlags = ['--headless', '--disable-gpu', '--disable-dev-shm-usage'];
  if (ci) chromeFlags.push('--no-sandbox');
  return launch({chromePath, chromeFlags});
}
