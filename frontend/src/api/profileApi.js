// ==============================================================================
// PROFILI: fotoja e profilit (avatar) në Supabase Storage
// ==============================================================================
// Fotoja zvogëlohet në shfletues (katror 400x400, JPEG) dhe ruhet te bucket-i publik
// `avatars/{user_id}.jpg`. URL-ja ruhet te `profiles.avatar_url` përmes RPC `set_my_avatar`
// (shih supabase/schema.sql, seksioni 11).

import { supabase, toAppError } from '../lib/supabaseClient';

const BUCKET = 'avatars';
const AVATAR_SIZE = 400;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Fotoja nuk mund të lexohet. Provoni një foto JPG ose PNG.'));
    };
    img.src = url;
  });

// Pret qendrën e fotos në katror dhe e zvogëlon në AVATAR_SIZE x AVATAR_SIZE
export const resizeToSquareJpeg = async (file, size = AVATAR_SIZE, quality = 0.85) => {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const target = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  // Sfond i bardhë për PNG-të transparente (JPEG s'ka transparencë)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target, target);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, target, target);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Dështoi përpunimi i fotos.'))), 'image/jpeg', quality)
  );
};

export const profileApi = {
  // Ngarkon foton e re dhe kthen URL-në e ruajtur te profili
  uploadAvatar: async (userId, file) => {
    if (!file?.type?.startsWith('image/')) throw new Error('Zgjidhni një skedar fotoje.');
    if (file.size > MAX_INPUT_BYTES) throw new Error('Fotoja është shumë e madhe (maksimumi 15 MB).');

    const blob = await resizeToSquareJpeg(file);
    const path = `${userId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (uploadError) throw toAppError(uploadError, 'Dështoi ngarkimi i fotos.');

    // `?v=` ndryshon me çdo ngarkim që shfletuesit/CDN-ja të mos shfaqin foton e vjetër
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.rpc('set_my_avatar', { p_url: url });
    if (error) throw toAppError(error, 'Dështoi ruajtja e fotos te profili.');
    return url;
  },

  removeAvatar: async (userId) => {
    const { error } = await supabase.rpc('set_my_avatar', { p_url: null });
    if (error) throw toAppError(error, 'Dështoi heqja e fotos.');
    // Skedari fshihet pasi profili s'i referohet më; dështimi këtu nuk e prish asgjë
    await supabase.storage.from(BUCKET).remove([`${userId}.jpg`]);
  }
};
