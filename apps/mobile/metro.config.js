const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules')
    ],
    // Native build intermediates (CMake/.cxx, Gradle/Xcode build dirs) churn files
    // fast enough during a native rebuild to crash Metro's fs watcher (ENOENT on a
    // dir it's watching that gets deleted mid-build) — Metro never needs JS from them.
    blockList: [/[\\/]\.cxx[\\/]/, /[\\/]android[\\/]build[\\/]/, /[\\/]android[\\/]\.gradle[\\/]/, /[\\/]ios[\\/]build[\\/]/],
    // The Electron desktop app (root package.json) pins a different react version
    // than this app, so npm can't hoist a single shared copy — react-native itself
    // is hoisted to the workspace root, so its internal `require('react')` would
    // otherwise resolve to the *other* copy than the one App.tsx gets, breaking
    // React's hook dispatcher singleton ("Invalid hook call"). `extraNodeModules` is
    // only a fallback for names normal resolution *fails* to find, so it doesn't
    // help here — normal resolution "succeeds" at the wrong path. Force it instead.
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react' || moduleName === 'react/jsx-runtime') {
        return context.resolveRequest(
          { ...context, originModulePath: path.resolve(projectRoot, 'package.json') },
          moduleName,
          platform
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    }
  }
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
