interface Props {
  coverUrl?: string | null;
  title: string;
  songId: string;
  isPlaying?: boolean;
}

/**
 * Old/simple iOS lock-screen layout: no big centre PFP/artwork.
 * The cover only drives the animated blurred background and the compact
 * now-playing widget artwork below.
 */
const LockScreenArtwork = (_props: Props) => <div className="h-7 flex-shrink-0" aria-hidden />;

export default LockScreenArtwork;
