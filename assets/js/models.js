;(function () {
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function detectIphone(tokens) {
    let base = '';
    for (const t of tokens) {
      if (['15','14','13','12','11','8','7','6','se','x','xr','xs'].includes(t)) { base = t; break; }
      if (t === '6s') { base = '6s'; break; }
    }
    if (!base) return null;
    const hasMini = tokens.includes('mini');
    const hasPlus = tokens.includes('plus');
    const hasPro = tokens.includes('pro');
    const hasMax = tokens.includes('max') || tokens.includes('pm');
    let phrase = base;
    if (base === 'xs' && hasMax) phrase = 'xs max';
    else {
      const parts = [];
      if (hasMini) parts.push('mini');
      if (hasPlus) parts.push('plus');
      if (hasPro) parts.push('pro');
      if (hasMax && (hasPro || base === 'xs')) parts.push('max');
      if (parts.length) phrase = `${base} ${parts.join(' ')}`;
    }
    return { brand: 'phone', modelPhrase: phrase };
  }
  function detectSamsung(q) {
    const mS = q.match(/s(\d{2})\s*(ultra|plus|fe)?/);
    if (mS) return { brand: 'samsung', modelPhrase: `s${mS[1]}${mS[2] ? ' ' + mS[2] : ''}` };
    const mN = q.match(/note\s*(\d{1,2})\s*(ultra|plus)?/);
    if (mN) return { brand: 'samsung', modelPhrase: `note ${mN[1]}${mN[2] ? ' ' + mN[2] : ''}` };
    const mA = q.match(/a(\d{2})/);
    if (mA) return { brand: 'samsung', modelPhrase: `a${mA[1]}` };
    return null;
  }
  function detectPixel(q) {
    const mP = q.match(/pixel\s*(\d+)\s*(pro|a)?/);
    if (mP) return { brand: 'pixel', modelPhrase: `pixel ${mP[1]}${mP[2] ? ' ' + mP[2] : ''}` };
    return null;
  }
  function detectXiaomi(q) {
    const mRN = q.match(/note\s*(\d{1,2})/);
    if (mRN) return { brand: 'xiaomi', modelPhrase: `note ${mRN[1]}` };
    const mR = q.match(/redmi\s*(\d{1,3})/);
    if (mR) return { brand: 'xiaomi', modelPhrase: `redmi ${mR[1]}` };
    const mMi = q.match(/mi\s*(\d{1,2})/);
    if (mMi) return { brand: 'xiaomi', modelPhrase: `mi ${mMi[1]}` };
    const mPoco = q.match(/poco\s*([fx])\s*(\d{1,2})/);
    if (mPoco) return { brand: 'xiaomi', modelPhrase: `poco ${mPoco[1]}${mPoco[2]}` };
    return null;
  }
  function detectOppo(q) {
    const mReno = q.match(/reno\s*(\d{1,2})\s*(pro|plus)?/);
    if (mReno) return { brand: 'oppo', modelPhrase: `reno ${mReno[1]}${mReno[2] ? ' ' + mReno[2] : ''}` };
    const mA = q.match(/a(\d{2})/);
    if (mA) return { brand: 'oppo', modelPhrase: `a${mA[1]}` };
    return null;
  }
  function detectVivo(q) {
    const mV = q.match(/v(\d{2})\s*(pro)?/);
    if (mV) return { brand: 'vivo', modelPhrase: `v${mV[1]}${mV[2] ? ' ' + mV[2] : ''}` };
    const mY = q.match(/y(\d{2})/);
    if (mY) return { brand: 'vivo', modelPhrase: `y${mY[1]}` };
    return null;
  }
  function detectRealme(q) {
    const mC = q.match(/c(\d{2})/);
    if (mC) return { brand: 'realme', modelPhrase: `c${mC[1]}` };
    const mNum = q.match(/realme\s*(\d{1,2})\s*(pro)?/);
    if (mNum) return { brand: 'realme', modelPhrase: `realme ${mNum[1]}${mNum[2] ? ' ' + mNum[2] : ''}` };
    return null;
  }
  function detectHuawei(q) {
    const mP = q.match(/p(\d{2})\s*(pro|lite)?/);
    if (mP) return { brand: 'huawei', modelPhrase: `p${mP[1]}${mP[2] ? ' ' + mP[2] : ''}` };
    const mMate = q.match(/mate\s*(\d{1,2})\s*(pro|lite)?/);
    if (mMate) return { brand: 'huawei', modelPhrase: `mate ${mMate[1]}${mMate[2] ? ' ' + mMate[2] : ''}` };
    return null;
  }
  function detectModel(query) {
    const q = norm(query);
    const tokens = q.split(/\s+/).map((t) => (t === 'iphone' ? 'phone' : t));
    if (tokens.includes('phone')) {
      const r = detectIphone(tokens);
      if (r) return r;
    }
    if (tokens.includes('samsung') || tokens.includes('galaxy')) {
      const r = detectSamsung(q);
      if (r) return r;
    }
    if (tokens.includes('pixel') || tokens.includes('google')) {
      const r = detectPixel(q);
      if (r) return r;
    }
    if (tokens.includes('redmi') || tokens.includes('xiaomi') || tokens.includes('mi') || tokens.includes('poco')) {
      const r = detectXiaomi(q);
      if (r) return r;
    }
    if (tokens.includes('oppo')) {
      const r = detectOppo(q);
      if (r) return r;
    }
    if (tokens.includes('vivo')) {
      const r = detectVivo(q);
      if (r) return r;
    }
    if (tokens.includes('realme')) {
      const r = detectRealme(q);
      if (r) return r;
    }
    if (tokens.includes('huawei')) {
      const r = detectHuawei(q);
      if (r) return r;
    }
    return null;
  }
  window.detectModel = detectModel;
})(); 
