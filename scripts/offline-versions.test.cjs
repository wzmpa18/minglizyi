const test=require('node:test');
const assert=require('node:assert/strict');
const {compareVersion,meetsMinAppVersion}=require('../src/lib/offlineVersions.ts');
test('public v-prefixed version installs the same minimum app pack',()=>{
  assert.equal(compareVersion('v25.0.115','25.0.115'),0);
  assert.equal(meetsMinAppVersion('25.0.115','v25.0.115'),true);
  assert.equal(meetsMinAppVersion('25.0.107','V25.0.115'),true);
  assert.equal(meetsMinAppVersion('25.0.116','v25.0.115'),false);
});
test('numeric ordering and older versions cannot bypass the minimum',()=>{
  assert.equal(compareVersion('1.10.0','1.9.99'),1);
  assert.equal(compareVersion(' 25.0 ','25.0.0'),0);
  assert.equal(meetsMinAppVersion('25.0.115','25.0.114'),false);
  assert.equal(meetsMinAppVersion('25.0.115','1.0.115'),false);
});
test('malformed or absent versions fail closed instead of becoming zero',()=>{
  for(const value of ['', 'unknown', '25.bad.999', '25.0.115.evil', null]){
    assert.equal(meetsMinAppVersion('0.0.0',value),false);
    assert.equal(meetsMinAppVersion(value,'25.0.115'),false);
    assert.throws(()=>compareVersion(value,'0.0.0'));
  }
});
