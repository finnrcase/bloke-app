import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export const PROFILE_PHOTO_BUCKET = 'profile-images';

type PickedProfilePhoto = {
  uri: string;
};

export async function pickAndCropProfilePhoto(): Promise<PickedProfilePhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload a profile image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    base64: false,
    exif: false,
    mediaTypes: ['images'],
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const actions = getSquareCropActions(asset.width, asset.height);
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [...actions, { resize: { height: 720, width: 720 } }],
    {
      compress: 0.86,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return { uri: manipulated.uri };
}

export async function uploadProfilePhoto(userId: string, localUri: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  try {
    const response = await fetch(localUri);
    const fileBody = await response.arrayBuffer();
    const path = `${userId}/profile-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, fileBody, {
        cacheControl: '31536000',
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not upload profile image.' };
  }
}

function getSquareCropActions(width?: number | null, height?: number | null): ImageManipulator.Action[] {
  if (!width || !height || width <= 0 || height <= 0 || width === height) {
    return [];
  }

  const size = Math.min(width, height);
  return [
    {
      crop: {
        height: size,
        originX: Math.floor((width - size) / 2),
        originY: Math.floor((height - size) / 2),
        width: size,
      },
    },
  ];
}
