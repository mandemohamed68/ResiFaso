const fs = require('fs');
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

    const regex = /([a-zA-Z0-9_.*?()\- /]+?)\.toString\(\)\.replace\(\/\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)\/g,\s*" "\)/g;
    
    content = content.replace(regex, (match, p1) => {
      // p1 is the expression before .toString()
      // Let's wrap it in a safe ternary
      return `((${p1} || 0).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, " "))`;
    });

    if (content !== original) {
      fs.writeFileSync(file, content);
      replaced++;
      console.log(`Replaced in ${file}`);
    }
  });
  console.log(`Finished. Replaced in ${replaced} files.`);
});
