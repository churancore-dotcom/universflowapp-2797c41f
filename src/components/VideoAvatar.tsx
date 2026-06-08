import { memo, useEffect, useRef } from 'react';
import headphonesBoy from '@/assets/avatars/headphones-boy.mp4.asset.json';
import chainGuy from '@/assets/avatars/chain-guy.mp4.asset.json';
import glassesBeard from '@/assets/avatars/glasses-beard.mp4.asset.json';
import wavyGirl from '@/assets/avatars/wavy-girl.mp4.asset.json';
import coffeeGirl from '@/assets/avatars/coffee-girl.mp4.asset.json';
import peaceGuy from '@/assets/avatars/peace-guy.mp4.asset.json';
import kissGirl from '@/assets/avatars/kiss-girl.mp4.asset.json';
import thumbsGuy from '@/assets/avatars/thumbs-guy.mp4.asset.json';

export type AvatarVariant =
  | 'headphones-boy'
  | 'chain-guy'
  | 'glasses-beard'
  | 'wavy-girl'
  | 'coffee-girl'
  | 'peace-guy'
  | 'kiss-girl'
  | 'thumbs-guy';

const SRC: Record<AvatarVariant, string> = {
  'headphones-boy': headphonesBoy.url,
  'chain-guy': chainGuy.url,
  'glasses-beard': glassesBeard.url,
  'wavy-girl': wavyGirl.url,
  'coffee-girl': coffeeGirl.url,
  'peace-guy': peaceGuy.url,
  'kiss-girl': kissGirl.url,
  'thumbs-guy': thumbsGuy.url,
};

interface Props {
  variant: AvatarVariant;
  size?: number;
  paused?: boolean;
}

const VideoAvatar = memo(({ variant, size = 96, paused = false }: Props) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const src = SRC[variant];

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-full bg-black"
      style={{ width: size, height: size, contain: 'paint' }}
      aria-hidden="true"
    >
      <video
        ref={ref}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        // @ts-ignore — non-standard but improves background playback on iOS Safari
        disableRemotePlayback
        preload="auto"
        className="w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
});

VideoAvatar.displayName = 'VideoAvatar';

export default VideoAvatar;
