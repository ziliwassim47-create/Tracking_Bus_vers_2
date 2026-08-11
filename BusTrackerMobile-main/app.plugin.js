const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withCustomAndroidConfig(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      manifest.application = [{}];
    }

    const application = manifest.application[0];

    if (!application.$) {
      application.$ = {};
    }

    application.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });
};