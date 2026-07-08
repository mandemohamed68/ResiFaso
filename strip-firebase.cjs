const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.tsx");
project.addSourceFilesAtPaths("src/**/*.ts");

const files = project.getSourceFiles();

files.forEach(file => {
  let changed = false;

  // 1. Remove all imports from 'firebase/*' or '../../lib/firebase'
  const imports = file.getImportDeclarations();
  imports.forEach(imp => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.startsWith('firebase/') || moduleSpecifier.includes('lib/firebase')) {
      imp.remove();
      changed = true;
    }
  });

  // 2. Remove if (dbType === 'firebase') blocks
  const ifStatements = file.getDescendantsOfKind(SyntaxKind.IfStatement);
  // We need to iterate backwards or collect them first
  const ifToRemove = [];
  const ifToReplaceWithElse = [];

  ifStatements.forEach(ifStmt => {
    const expr = ifStmt.getExpression();
    const text = expr.getText();
    if (text === "dbType === 'firebase'") {
      if (ifStmt.getElseStatement()) {
        ifToReplaceWithElse.push(ifStmt);
      } else {
        ifToRemove.push(ifStmt);
      }
    } else if (text === "dbType !== 'firebase'") {
      // keep the if, remove the else (which is firebase)
      // Actually in our code it's usually `if (dbType !== 'firebase') { ... }` (no else)
      if (ifStmt.getElseStatement()) {
        ifToRemove.push(ifStmt.getElseStatement());
      }
    }
  });

  ifToRemove.forEach(node => {
    try { node.remove(); changed = true; } catch (e) {}
  });

  ifToReplaceWithElse.forEach(ifStmt => {
    try {
      const elseStmt = ifStmt.getElseStatement();
      if (elseStmt) {
        // Replace the whole if statement with the contents of the else statement
        let elseText = elseStmt.getText();
        if (elseStmt.getKind() === SyntaxKind.Block) {
          // Remove the curly braces
          elseText = elseText.substring(1, elseText.length - 1).trim();
        }
        ifStmt.replaceWithText(elseText);
        changed = true;
      }
    } catch (e) {}
  });
  
  // Remove ternary `dbType === 'firebase' ? ... : ...`
  const conditionals = file.getDescendantsOfKind(SyntaxKind.ConditionalExpression);
  const condsToReplace = [];
  conditionals.forEach(cond => {
    if (cond.getCondition().getText() === "dbType === 'firebase'") {
      condsToReplace.push(cond);
    }
  });
  
  condsToReplace.forEach(cond => {
    try {
      cond.replaceWithText(cond.getWhenFalse().getText());
      changed = true;
    } catch (e) {}
  });

  // Remove `dbType === 'firebase' && ...`
  const binExprs = file.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  const binsToRemove = [];
  binExprs.forEach(bin => {
    if (bin.getOperatorToken().getKind() === SyntaxKind.AmpersandAmpersandToken) {
      if (bin.getLeft().getText() === "dbType === 'firebase'") {
        binsToRemove.push(bin);
      }
    }
  });
  binsToRemove.forEach(bin => {
    try {
      // It's part of a statement, so we might need to remove the whole statement
      const stmt = bin.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
      if (stmt) {
        stmt.remove();
        changed = true;
      }
    } catch (e) {}
  });

  if (changed) {
    console.log(`Updated ${file.getFilePath()}`);
    file.saveSync();
  }
});
