// Fix broken pnpm symlinks after node_modules.tar.gz extraction
//
// Problem: When node_modules.tar.gz is extracted on a different machine,
// pnpm's absolute-path symlinks point to the original machine's paths.
// Running "pnpm install" fails because there's no internet in intranet.
//
// Solution: Recursively scan node_modules/.pnpm and recreate all
// necessary symlinks with correct local paths.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', 'fastgpt-source');
const NODE_MODULES = path.join(ROOT, 'node_modules');
const DOT_PNPM = path.join(NODE_MODULES, '.pnpm');

function log(msg) { console.log(`  ${msg}`); }
function warn(msg) { console.log(`  [WARN] ${msg}`); }
function ok(msg) { console.log(`  [OK] ${msg}`); }

// Check if we can create symlinks (Windows needs admin or developer mode)
function canSymlink() {
  try {
    const testLink = path.join(NODE_MODULES, '._symlink_test_');
    const testTarget = path.join(NODE_MODULES, '._symlink_target_');
    fs.mkdirSync(testTarget, { recursive: true });
    fs.symlinkSync(testTarget, testLink, 'junction');
    fs.unlinkSync(testLink);
    fs.rmdirSync(testTarget);
    return 'junction';
  } catch {
    try {
      const testLink = path.join(NODE_MODULES, '._symlink_test_');
      const testTarget = path.join(NODE_MODULES, '._symlink_target_');
      fs.mkdirSync(testTarget, { recursive: true });
      fs.symlinkSync(testTarget, testLink, 'dir');
      fs.unlinkSync(testLink);
      fs.rmdirSync(testTarget);
      return 'dir';
    } catch {
      return null;
    }
  }
}

// Parse a .pnpm directory entry like "@scope+package@1.2.3" or "package@1.2.3"
// Returns { name: "@scope/package" or "package", version: "1.2.3" }
// For entries with peer deps like "package@1.2.3_peer@4.5.6", extracts the main version
function parsePnpmDir(dirName) {
  // Find the version part: the first @ followed by a digit
  // Version always starts with a number in pnpm directory names
  const versionAtIdx = dirName.search(/@\d/);
  if (versionAtIdx === -1) return null;

  const namePart = dirName.substring(0, versionAtIdx);
  const versionPart = dirName.substring(versionAtIdx + 1); // after @

  // Extract version: everything until _ (peer dep separator) or end
  const underscoreIdx = versionPart.indexOf('_');
  const version = underscoreIdx >= 0 ? versionPart.substring(0, underscoreIdx) : versionPart;

  // Convert + back to / for scoped packages
  // @scope+package → @scope/package
  let name = namePart;
  if (name.startsWith('@')) {
    name = name.replace('+', '/');
  }

  return {
    name,
    version,
    fullName: dirName
  };
}

// Check if a path is a broken symlink or a text file containing a path (failed symlink)
function isBrokenLink(p) {
  try {
    const stat = fs.lstatSync(p);
    if (stat.isSymbolicLink()) {
      try {
        fs.statSync(p);  // Check if target exists
        return false;    // Symlink works
      } catch {
        return true;     // Symlink broken
      }
    }
  } catch {
    // File doesn't exist at all
    return true;
  }
  return false;
}

// Fix or create a symlink from node_modules/<name> to .pnpm/<dirName>/node_modules/<name>
function ensureSymlink(name, dirName, symlinkType) {
  // For scoped packages, need to create the scope directory first
  const linkPath = path.join(NODE_MODULES, name);
  const scopeDir = path.dirname(linkPath);

  // Target inside .pnpm virtual store
  const targetPath = path.join(DOT_PNPM, dirName, 'node_modules', name);

  if (!fs.existsSync(targetPath)) {
    // Sometimes the target is slightly different for scoped packages
    // Try alternative: .pnpm/@scope+package@version/node_modules/@scope/package
    return false;
  }

  // Create scope directory if needed
  if (!fs.existsSync(scopeDir)) {
    fs.mkdirSync(scopeDir, { recursive: true });
  }

  // Remove existing broken link/file
  if (fs.existsSync(linkPath) || isBrokenLink(linkPath)) {
    try {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else if (stat.isDirectory()) {
        // It's already a real directory, not a symlink - skip
        return true;
      } else {
        fs.unlinkSync(linkPath);
      }
    } catch {
      // File might not exist (broken symlink)
      try { fs.unlinkSync(linkPath); } catch {}
    }
  }

  if (fs.existsSync(linkPath)) {
    return true; // Already exists and is valid
  }

  // Create symlink
  try {
    const relative = path.relative(path.dirname(linkPath), targetPath);
    if (symlinkType === 'junction') {
      // Junctions must be absolute on Windows
      fs.symlinkSync(targetPath, linkPath, 'junction');
    } else if (symlinkType === 'dir') {
      fs.symlinkSync(targetPath, linkPath, 'dir');
    } else {
      // No symlink support - copy the directory as fallback
      copyDir(targetPath, linkPath);
    }
    return true;
  } catch (e) {
    // If symlink fails, try copying as last resort
    warn(`Cannot symlink ${name}, trying copy: ${e.message}`);
    try {
      copyDir(targetPath, linkPath);
      return true;
    } catch {
      return false;
    }
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      try { fs.symlinkSync(target, destPath); } catch { fs.copyFileSync(srcPath, destPath); }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Fix pnpm Symlinks - Offline Repair     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (!fs.existsSync(DOT_PNPM)) {
    console.error('[ERROR] node_modules/.pnpm not found!');
    console.error('Please extract node_modules.tar.gz first or run pnpm install');
    process.exit(1);
  }

  // Check symlink capability
  const symlinkType = canSymlink();
  if (symlinkType) {
    ok(`Symlink support: ${symlinkType}`);
  } else {
    warn('No symlink support - will copy files instead (uses more disk space)');
    warn('Run terminal as Administrator to enable symlinks');
  }

  // Scan .pnpm directory
  const pnpmDirs = fs.readdirSync(DOT_PNPM, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`\n  Found ${pnpmDirs.length} packages in .pnpm store`);

  // Parse and create symlinks
  let fixed = 0;
  let skipped = 0;
  let failed = 0;
  const seen = new Set(); // Track packages we've handled to avoid duplicates

  for (const dirName of pnpmDirs) {
    const parsed = parsePnpmDir(dirName);
    if (!parsed) continue;

    // Skip if we've already handled this package name
    // (there may be multiple versions, we prefer the first one - usually the one without peer deps)
    if (seen.has(parsed.name)) {
      skipped++;
      continue;
    }
    seen.add(parsed.name);

    if (ensureSymlink(parsed.name, parsed.fullName, symlinkType)) {
      fixed++;
    } else {
      failed++;
      warn(`Failed: ${parsed.name} (${parsed.fullName})`);
    }
  }

  // Also fix .bin directory symlinks
  const dotBinDir = path.join(NODE_MODULES, '.bin');
  if (fs.existsSync(dotBinDir)) {
    log('Fixing .bin symlinks...');
    const binFiles = fs.readdirSync(dotBinDir);
    for (const binFile of binFiles) {
      const binPath = path.join(dotBinDir, binFile);
      try {
        const stat = fs.lstatSync(binPath);
        if (stat.isSymbolicLink()) {
          const target = fs.readlinkSync(binPath);
          // Check if target exists, if not try to find correct path
          if (!fs.existsSync(path.resolve(dotBinDir, target))) {
            // Search for the binary in .pnpm
            const found = findBinInPnpm(binFile);
            if (found) {
              fs.unlinkSync(binPath);
              if (symlinkType) {
                fs.symlinkSync(found, binPath, symlinkType === 'junction' ? 'junction' : 'file');
              }
            }
          }
        }
      } catch {}
    }
  }

  console.log(`\n  ─────────────────────────────────────`);
  console.log(`  Fixed:   ${fixed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  ─────────────────────────────────────\n`);

  if (failed > 0) {
    console.log('  Some symlinks could not be created.');
    console.log('  Try running this script as Administrator.\n');
    process.exit(1);
  }

  console.log('  All symlinks repaired successfully!\n');
}

function findBinInPnpm(binName) {
  const dirs = fs.readdirSync(DOT_PNPM, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of dirs) {
    const binPath = path.join(DOT_PNPM, dir.name, 'node_modules', '.bin', binName);
    if (fs.existsSync(binPath)) return binPath;
  }
  return null;
}

main();
