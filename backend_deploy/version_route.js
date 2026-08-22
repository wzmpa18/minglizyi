const fs = require('fs');
const path = require('path');

module.exports = function(req, res, next) {
  if (req.path === '/api/version' || req.path === '/version') {
    let artifactSha = '';
    let buildManifest = {};
    try {
      const shaFile = '/root/yandaoguoxue/current/ARTIFACT_SHA.txt';
      if (fs.existsSync(shaFile)) {
        artifactSha = fs.readFileSync(shaFile, 'utf8').trim();
      }
      const mfFile = '/root/yandaoguoxue/current/build-manifest.json';
      if (fs.existsSync(mfFile)) {
        buildManifest = JSON.parse(fs.readFileSync(mfFile, 'utf8'));
      }
    } catch(e) {}

    return res.json({
      project: 'minglizyi',
      environment: 'production',
      release_id: 'v25.0.0_build_D2026_08_12_09_23_59',
      git_sha: 'f30926fd6e520673f020938bccc2ce7bf9de7213',
      build_id: 'v25.0.0_build_D2026_08_12_09_23_59',
      artifact_payload_sha256: artifactSha,
      deployment_id: 'deploy_D2026_08_12_09_23_59',
      deployed_at: new Date().toISOString(),
      db_migration_version: '002',
      feature_manifest_summary: {
        tested: 0,
        implemented: 0,
        partial: 36,
        broken: 0
      }
    });
  }
  next();
};
