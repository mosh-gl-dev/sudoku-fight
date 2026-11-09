// Prints one task from the LOCAL catalog (newest wording), not the run's snapshot.
// node task.cjs <taskId>
const fs = require('fs');
const path = require('path');
const id = process.argv[2];
const catalog = JSON.parse(fs.readFileSync(path.resolve('apps/server/data/qa-catalog.json'), 'utf8'));
for (const c of catalog.categories)
  for (const s of c.subcategories)
    for (const t of s.tasks)
      if (t.id === id) {
        console.log(`[${c.title} / ${s.title}] ${t.id} (who: ${t.who}, catalog v${catalog.catalogVersion})`);
        console.log(`# ${t.title}\n${t.subtitle}\n\nצעדים:`);
        t.steps.forEach((x, i) => console.log(`${i + 1}. ${x}`));
        console.log('\nצפוי:');
        t.expected.forEach((x) => console.log(`- ${x}`));
        if (t.source) console.log(`\nמקור: ${t.source}`);
        process.exit(0);
      }
console.error(`no task ${id} in the local catalog`);
process.exit(1);
