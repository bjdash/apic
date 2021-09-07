// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import packageInfo from '../../package.json';
export const environment = {
  production: false,
  host: 'http://localhost:8080/',
  VERSION: packageInfo.version,
  PLATFORM: 'ELECTRON',
  CAPTCHA_SITE_KEY: '6Le_RmcUAAAAAMD717-PEB6il8QW3wTcPgbBpnXl',
  GOOGLE_CLIENT_ID: '918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com'
};
