const fs = require('fs');
const glob = require('glob');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk('./src', function(err, files) {
  if (err) throw err;
  let replaced = 0;
  
  files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We do multiple passes for simplicity
    const regex1 = /\(\( *([^)]+?) *\|\| *0\)\.toString\(\)\.replace\(\/\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)\/g, " "\)\)/g;
    const regex2 = /\(\( *([^)]+?) *\)\.toString\(\)\.replace\(\/\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)\/g, " "\)\)/g;
    const regex3 = /([^.]+?)\.toString\(\)\.replace\(\/\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)\/g, " "\)/g;

    content = content.replace(regex1, "formatCurrency($1)");
    content = content.replace(regex2, "formatCurrency($1)");
    content = content.replace(regex3, "formatCurrency($1)");
    
    // Also add `import { formatCurrency } from ...` if it's not and we have matches
    if (content !== original || content.includes('formatCurrency')) {
        let importPath = '';
        if (file.includes('utils')) {
            importPath = ''; // don't import in utils
        } else if (file.includes('components/')) {
            const uplevels = file.split('/').length - 3;
            importPath = '../'.repeat(uplevels) + 'utils/currency';
        } else {
            importPath = './utils/currency';
        }

        if (importPath && !content.includes('import { formatCurrency }') && content.includes('formatCurrency')) {
            content = "import { formatCurrency } from '" + importPath + "';\n" + content;
        }
        
      fs.writeFileSync(file, content);
      replaced++;
      console.log(`Replaced in ${file}`);
    }
  });
  console.log(`Finished. Replaced in ${replaced} files.`);
});
