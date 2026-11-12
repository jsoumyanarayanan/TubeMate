// src/lib/playerSource.ts
// The single place the player gets its source from. HLS or DASH streaming plugs in here later:
// return a manifest URL and attach the streaming library to the video element.
import type { Video } from '@/lib/api'

export const playerSource = (video: Video) => video.src
