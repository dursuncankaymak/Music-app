'use strict';

// Uygulamada listelenen müzik servisleri.
// controls: medya tuşları için her servisin web oynatıcısındaki buton seçicileri.
// Seçici bulunamazsa app.js genel bir <video>/<audio> yedeğine düşer.
const SERVICES = [
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    url: 'https://music.youtube.com',
    color: '#ff0033',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M10 8.8v6.4l5.4-3.2L10 8.8z" fill="currentColor"/></svg>`,
    controls: {
      playpause: ['#play-pause-button', 'tp-yt-paper-icon-button.play-pause-button'],
      next: ['.next-button', 'tp-yt-paper-icon-button.next-button'],
      prev: ['.previous-button', 'tp-yt-paper-icon-button.previous-button'],
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    url: 'https://open.spotify.com',
    color: '#1ed760',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 10.2c3-.9 6.3-.7 9 .9M8 13c2.4-.7 5-.5 7.2.8M8.6 15.6c1.8-.5 3.7-.4 5.4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    controls: {
      playpause: ['[data-testid="control-button-playpause"]'],
      next: ['[data-testid="control-button-skip-forward"]'],
      prev: ['[data-testid="control-button-skip-back"]'],
    },
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    url: 'https://soundcloud.com',
    color: '#ff5500',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 15.5v-3M6.5 16.5v-6M9 16.5V8.5M11.5 16.5v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 16.5h4.2a2.8 2.8 0 1 0-.4-5.6 4.3 4.3 0 0 0-3.8-3.4v9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    controls: {
      playpause: ['.playControl'],
      next: ['.skipControl__next'],
      prev: ['.skipControl__previous'],
    },
  },
  {
    id: 'deezer',
    name: 'Deezer',
    url: 'https://www.deezer.com',
    color: '#a238ff',
    icon: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="14" width="4" height="3" rx="0.5" fill="currentColor"/><rect x="10" y="11" width="4" height="6" rx="0.5" fill="currentColor"/><rect x="16" y="7" width="4" height="10" rx="0.5" fill="currentColor"/></svg>`,
    controls: {
      playpause: ['[data-testid="play_button_pause"]', '[data-testid="play_button_play"]'],
      next: ['[data-testid="next_track_button"]'],
      prev: ['[data-testid="previous_track_button"]'],
    },
  },
  {
    id: 'tidal',
    name: 'TIDAL',
    url: 'https://listen.tidal.com',
    color: '#33ffee',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M8 6l4 4 4-4 4 4-4 4-4-4-4 4-4-4 4-4zM12 14l4 4-4 4-4-4 4-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    controls: {
      playpause: ['[data-test="play"]', '[data-test="pause"]'],
      next: ['[data-test="next"]'],
      prev: ['[data-test="previous"]'],
    },
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    url: 'https://music.apple.com',
    color: '#fa2d48',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 17.5V7.2a1 1 0 0 1 .8-1l7-1.4a1 1 0 0 1 1.2 1v9.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.8" cy="17.5" r="2.2" stroke="currentColor" stroke-width="1.8"/><circle cx="15.8" cy="15" r="2.2" stroke="currentColor" stroke-width="1.8"/></svg>`,
    controls: {
      playpause: ['.playback-play__pause', '.playback-play__play', 'amp-playback-controls-play-pause button'],
      next: ['.playback-controls__forward button', 'amp-playback-controls-item-skip[direction="next"] button'],
      prev: ['.playback-controls__back button', 'amp-playback-controls-item-skip[direction="previous"] button'],
    },
  },
];
