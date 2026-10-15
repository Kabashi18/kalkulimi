import React, { useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Fotoja e faturës në madhësi të plotë (si ReceiptViewer në web): sfond i zi, mbyllje me × ose me
// butonin "mbrapa" të Android-it. `url` mund të jetë URL e përkohshme (signed URL) ose skedar lokal.
// Shikuesi ka gjithmonë sfond të zi -> teksti dhe ikonat janë gjithmonë të bardha (edhe në temën e errët)
const WHITE = '#ffffff';

export default function ReceiptViewer({ url, title, onClose }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text numberOfLines={1} className="text-sm font-semibold flex-1 mr-3" style={{ color: WHITE }}>
              {title ? `Fatura · ${title}` : 'Fatura'}
            </Text>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full items-center justify-center" accessibilityLabel="Mbyll" hitSlop={8}>
              <Ionicons name="close" size={26} color={WHITE} />
            </TouchableOpacity>
          </View>

          <Pressable className="flex-1 items-center justify-center px-3 pb-6" onPress={onClose}>
            {loading && !failed && <ActivityIndicator size="large" color={WHITE} style={{ position: 'absolute' }} />}
            {failed ? (
              <Text className="text-sm text-center px-6" style={{ color: WHITE, opacity: 0.8 }}>Fotoja nuk mund të ngarkohet. Rifreskoni dhe provoni sërish.</Text>
            ) : (
              url && (
                <Image
                  source={{ uri: url }}
                  resizeMode="contain"
                  style={{ width: '100%', height: '100%' }}
                  onLoadStart={() => {
                    setLoading(true);
                    setFailed(false);
                  }}
                  onLoadEnd={() => setLoading(false)}
                  onError={() => setFailed(true)}
                  accessibilityLabel={title ? `Fatura e shpenzimit ${title}` : 'Fatura'}
                />
              )
            )}
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
