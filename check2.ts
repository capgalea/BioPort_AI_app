async function run() {
  for (const url of [
    'http://localhost:3000/components/Dashboard.tsx',
    'http://localhost:3000/components/AcademicDashboard.tsx',
    'http://localhost:3000/components/NetworkGraph.tsx',
    'http://localhost:3000/types.ts',
    'http://localhost:3000/components/Tooltip.tsx'
  ]) {
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      console.log(url, "Status:", resp.status);
      if (resp.status !== 200 || text.includes('Error')) {
          console.log(text.substring(0, 500));
      }
    } catch (e) {
      console.error(url, e);
    }
  }
}
run();
