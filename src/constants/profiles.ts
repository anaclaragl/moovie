import { ImageSourcePropType } from 'react-native';

export const profileAvatars: Record<string, ImageSourcePropType> = {
  ana: require('../../assets/cowana.jpg'),
  luisa: require('../../assets/cowluisa.jpg'),
};

export function getProfileAvatar(key: string): ImageSourcePropType | null {
  if (key === 'ana') return profileAvatars.ana;
  if (key === 'luisa') return profileAvatars.luisa;
  return null;
}
