import { ImageSourcePropType } from 'react-native';

export const profileAvatars: Record<string, ImageSourcePropType> = {
  ana: require('../../assets/cowana.jpg'),
  luisa: require('../../assets/cowluisa.jpg'),
  shared: require('../../assets/meandmygirl.jpeg'),
};

export function getProfileAvatar(key: string): ImageSourcePropType | null {
  if (key === 'ana') return profileAvatars.ana;
  if (key === 'luisa') return profileAvatars.luisa;
  if (key === 'shared' || key === 'cooperative') return profileAvatars.shared;
  return null;
}

export const sharedListAvatar = profileAvatars.shared;
