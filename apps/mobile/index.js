/**
 * @format
 */

// @iptv-genius/core's xtream client assumes Node/browser globals (URL,
// URLSearchParams, Buffer) that Hermes doesn't provide — polyfill before
// anything else imports core. See [[iptv-genius-mobile-tv-port]].
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer ?? Buffer;

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
