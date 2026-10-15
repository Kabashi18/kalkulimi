// Kompresimi i fotos së faturës në shfletues (si avatarët te api/profileApi.js, por pa prerje në katror):
// anija më e gjatë zvogëlohet në <= 1600px dhe ruhet si JPEG. Teksti i faturës mbetet i lexueshëm,
// ndërsa madhësia zakonisht bie në 200-500 KB (bucket-i `receipts` pranon deri në 3 MB).

const MAX_SIDE = 1600;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;

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

const toJpeg = (canvas, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Dështoi përpunimi i fotos.'))), 'image/jpeg', quality)
  );

/** Kthen një Blob JPEG të kompresuar, gati për ngarkim te Supabase Storage. */
export const compressReceipt = async (file) => {
  if (!file?.type?.startsWith('image/')) throw new Error('Zgjidhni një skedar fotoje.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Fotoja është shumë e madhe (maksimumi 20 MB).');

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  // Sfond i bardhë për PNG-të transparente (JPEG s'ka transparencë)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let blob = await toJpeg(canvas, 0.8);
  if (blob.size > MAX_OUTPUT_BYTES) blob = await toJpeg(canvas, 0.6);
  if (blob.size > MAX_OUTPUT_BYTES) throw new Error('Fotoja mbetet shumë e madhe edhe pas kompresimit.');
  return blob;
};
