// Patches electron-builder so the Linux AppImage target also builds on Windows.
//
// electron-builder creates POSIX symlinks for the AppImage's icon files.
// Windows only permits that with Developer Mode enabled (or an elevated
// shell), so the build aborts with "EPERM: operation not permitted, symlink".
// We patch it to fall back to copying the icon, which produces an equivalent
// AppImage.
//
// Runs automatically through the "postinstall" npm script, and is a no-op on
// other platforms or when electron-builder's internals change.
const fs = require('fs');
const path = require('path');

const MARKER = 'MK61_PATCH_SYMLINK_FALLBACK';
const target = path.join(
  __dirname, '..', 'node_modules', 'app-builder-lib', 'out',
  'targets', 'appimage', 'appLauncher.js'
);

const FROM = [
  '    await fs.symlink(iconRelativeToStageFile, path.join(stageDir, iconFileName));',
  '    await fs.symlink(iconRelativeToStageFile, path.join(stageDir, ".DirIcon"));',
].join('\n');

const TO = [
  `    // ${MARKER}: Windows cannot create symlinks without Developer Mode,`,
  '    // so fall back to copying the icon (equivalent result for mksquashfs).',
  '    const linkOrCopy = async (targetPath) => {',
  '        try {',
  '            await fs.symlink(iconRelativeToStageFile, targetPath);',
  '        }',
  '        catch (e) {',
  '            await fs.copyFile(path.join(stageDir, iconRelativeToStageFile), targetPath);',
  '        }',
  '    };',
  '    await linkOrCopy(path.join(stageDir, iconFileName));',
  '    await linkOrCopy(path.join(stageDir, ".DirIcon"));',
].join('\n');

try {
  if (!fs.existsSync(target)) {
    console.log('[patch] electron-builder not present yet - nothing to do');
    process.exit(0);
  }
  const src = fs.readFileSync(target, 'utf8');
  if (src.includes(MARKER)) {
    console.log('[patch] AppImage symlink fallback already applied');
    process.exit(0);
  }
  if (!src.includes(FROM)) {
    console.log('[patch] electron-builder internals changed - skipping (AppImage may not build on this host)');
    process.exit(0);
  }
  fs.writeFileSync(target, src.replace(FROM, TO));
  console.log('[patch] applied AppImage symlink fallback for Windows');
} catch (err) {
  console.log('[patch] could not apply:', err.message);
}
