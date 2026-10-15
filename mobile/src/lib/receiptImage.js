import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Fotoja e faturës në mobil: bëhet me kamerë ose zgjidhet nga galeria, pastaj kompresohet si në web
// (frontend/src/lib/receiptImage.js): anija më e gjatë <= 1600px, JPEG. Kthen { uri, body } ku
// `body` (ArrayBuffer) ngarkohet te Supabase Storage dhe `uri` përdoret për pamjen paraprake.
const MAX_SIDE = 1600;

export const pickReceipt = async (source = 'camera') => {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Lejoni qasjen te kamera në cilësimet e telefonit për të fotografuar faturën.'
        : 'Lejoni qasjen te fotot në cilësimet e telefonit për të zgjedhur faturën.'
    );
  }

  const options = { mediaTypes: ['images'], quality: 1 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width || 0, asset.height || 0) > MAX_SIDE) {
    context.resize((asset.width || 0) >= (asset.height || 0) ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  const body = await (await fetch(saved.uri)).arrayBuffer();
  return { uri: saved.uri, body };
};
