const { getSetting } = require('/www/yandaoguoxue-backend/wechatOaDb');
console.log('cover_media_id =', JSON.stringify(getSetting('wechat_cover_media_id', '')));
console.log('cover_media_id_len =', (getSetting('wechat_cover_media_id', '') || '').length);
