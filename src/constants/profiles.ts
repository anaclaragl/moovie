import { ImageSourcePropType } from 'react-native';

export const profileAvatars: Record<string, ImageSourcePropType> = {
  ana: require('../../assets/cowana.jpg'),
  luisa: require('../../assets/cowluisa.jpg'),
  shared: require('../../assets/meandmygirl.jpeg'),
  watchedTogether: require('../../assets/watchedTogether.jpg'),
};

export function getProfileAvatar(key: string): ImageSourcePropType | null {
  if (key === 'ana') return profileAvatars.ana;
  if (key === 'luisa') return profileAvatars.luisa;
  if (key === 'shared' || key === 'cooperative') return profileAvatars.shared;
  if (key === 'watchedTogether' || key === 'watched_together') return profileAvatars.watchedTogether;
  return null;
}

export const sharedListAvatar = profileAvatars.shared;
export const watchedTogetherAvatar = profileAvatars.watchedTogether;
