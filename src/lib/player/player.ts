import { toDurationString, type Nullable } from '$lib/util';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { readDir } from '@tauri-apps/api/fs';
import { dirname, extname, basename } from '@tauri-apps/api/path';
import {
  derived,
  writable,
  type Unsubscriber,
  type Writable,
  get,
  type Readable
} from 'svelte/store';
import {
  type ExternalSubtitleMeta,
  type EmbeddedSubtitleMeta,
  type SubtitlesMeta,
  isSubtitleSupported,
  type Subtitle,
  type SubtitleMeta
} from './subtitle';
import * as HotkeyRegistry from '$lib/keyboard/hotkey';
import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api';
import type {
  AudioTrackList,
  NamedAudioTrack,
  NamedAudioTrackList,
  NamedVideoTrack,
  NamedVideoTrackList,
  VideoTrackList
} from './av';
import type { Bridge } from '$lib/store/bridge';
import {
  subtitleDisplay,
  playbackTime,
  activeSubtitle,
  activeSubtitleMeta
} from '$lib/store/player';

type Time = number;

export class Player {
  private _element: Nullable<HTMLMediaElement> = null;
  private timeUpdateFrozen = false;

  private duration = writable(-1);
  private unsubscribeDuration: Nullable<Unsubscriber> = null;

  private durationString = derived(this.duration, (duration) =>
    toDurationString(Math.max(Math.round(duration), 0))
  );
  private unsubscribeDurationString: Nullable<Unsubscriber> = null;

  private time: Bridge<number>;
  private unsubscribeTime: Nullable<Unsubscriber> = null;

  public timeString: Readable<string>;
  private unsubscribeTimeString: Nullable<Unsubscriber> = null;

  private paused = writable(true);
  private unsubscribePaused: Nullable<Unsubscriber> = null;

  private ended = writable(false);
  private unsubscribeEnded: Nullable<Unsubscriber> = null;

  private muted = writable(false);
  private unsubscribeMuted: Nullable<Unsubscriber> = null;

  private volume = writable(100);
  private unsubscribeVolume: Nullable<Unsubscriber> = null;

  private fullscreen = writable(false);
  private unsubscribeFullscreen: Nullable<Unsubscriber> = null;

  private subtitle: Bridge<Nullable<Subtitle>>;
  private lastChosenSubtitleMeta: Nullable<SubtitleMeta>;

  private subtitles = writable({
    external: [] as ExternalSubtitleMeta[],
    embedded: [] as EmbeddedSubtitleMeta[]
  });
  private unsubscribeSubtitles: Nullable<Unsubscriber> = null;

  private source: Nullable<string> = null;
  private subtitleDisplay: Bridge<string>;

  private loadedCallbacks: (() => unknown)[] = [];

  // * * * * * * * * * * * * * * * *
  // Construction

  constructor() {
    this.registerHotkeys();

    // ? Start loops
    this.startSubtitleDisplayLoop();

    // ? Configure bridges
    this.subtitleDisplay = subtitleDisplay.other;
    this.subtitleDisplay.setRelativeFlow('other');

    this.time = playbackTime;
    this.time.setRelativeFlow('other');

    this.subtitle = activeSubtitle.other;
    this.lastChosenSubtitleMeta = null;
    activeSubtitleMeta.subscribe((meta) => {
      if (meta) {
        this.lastChosenSubtitleMeta = meta;
      }
    });

    this.subtitle.setRelativeFlow('self');
    this.subtitle.subscribe((subtitle) => {
      if (!subtitle) {
        this.subtitleDisplay.set('');
      }
    });

    this.timeString = derived(this.time, (time) => toDurationString(Math.round(time)));
  }

  private startSubtitleDisplayLoop() {
    requestAnimationFrame(() => {
      this.updateSubtitleDisplay();
      this.startSubtitleDisplayLoop();
    });
  }

  private registerHotkeys() {
    HotkeyRegistry.register('M', () => {
      this.$muted ? this.unmute() : this.mute();
    });
    HotkeyRegistry.register('F', () => {
      this.$fullscreen ? this.exitFullscreen() : this.setFullscreen();
    });
    HotkeyRegistry.register('C', () => {
      this.toggleSubtitle();
    });
    HotkeyRegistry.register('Space', () => {
      this.$paused || this.$ended ? this.play() : this.pause();
    });
    HotkeyRegistry.register('Up', () => {
      this.setVolume(Math.min(100, this.$volume + 5));
    });
    HotkeyRegistry.register('Down', () => {
      this.setVolume(Math.max(0, this.$volume - 5));
    });
    HotkeyRegistry.register('Right', () => {
      if (!this.isLoaded()) return;
      if (!this.element.seeking) {
        // freezeSlider();
        this.time.update((time) => Math.min(this.$duration, time + 5));
        this.seek(this.$time);
        // unfreezeSlider();
      }
    });
    HotkeyRegistry.register('Left', () => {
      if (!this.isLoaded()) return;
      if (!this.element.seeking) {
        // freezeSlider();
        this.time.update((time) => Math.max(0, time - 5));
        this.seek(this.$time);
        // unfreezeSlider();
      }
    });
  }

  // * * * * * * * * * * * * * * * *
  // Effects

  private setFullscreen() {
    appWindow.setFullscreen(true).then(() => {
      this.fullscreen.set(true);
    });
  }

  private exitFullscreen() {
    appWindow.setFullscreen(false).then(() => {
      this.fullscreen.set(false);
    });
  }

  // * * * * * * * * * * * * * * * *
  // Bindings

  public bind(element: HTMLMediaElement) {
    this._element = element;
    element.addEventListener('loadedmetadata', () => {
      this.paused.set(false);
      this.refreshConfig();
      this.discoverSubtitles();
      this.loadedCallbacks.forEach((callback) => callback());
    });
    element.addEventListener('timeupdate', async () => {
      this.onTimeUpdated();
    });

    element.addEventListener('ended', () => {
      this.onEnded();
    });
  }

  public bindDuration(duration: Writable<number>) {
    this.unsubscribeDuration?.call(this);
    this.unsubscribeDuration = this.duration.subscribe((value) => {
      duration.set(value);
    });
  }

  public bindDurationString(durationString: Writable<string>) {
    this.unsubscribeDurationString?.call(this);
    this.unsubscribeDurationString = this.durationString.subscribe((value) => {
      durationString.set(value);
    });
  }

  public bindTime(time: Writable<number>) {
    this.unsubscribeTime?.call(this);
    this.unsubscribeTime = this.time.subscribe((value) => {
      if (!this.timeUpdateFrozen) time.set(value);
    });
  }

  public bindTimeString(timeString: Writable<string>) {
    this.unsubscribeTimeString?.call(this);
    this.unsubscribeTime = this.timeString.subscribe((value) => {
      timeString.set(value);
    });
  }

  public bindPaused(paused: Writable<boolean>) {
    this.unsubscribePaused?.call(this);
    this.unsubscribePaused = this.paused.subscribe((value) => {
      paused.set(value);
    });
  }

  public bindEnded(ended: Writable<boolean>) {
    this.unsubscribeEnded?.call(this);
    this.unsubscribeEnded = this.ended.subscribe((value) => ended.set(value));
  }

  public bindVolume(volume: Writable<number>) {
    this.unsubscribeVolume?.call(this);
    this.unsubscribeVolume = this.volume.subscribe((value) => volume.set(value));
  }

  public bindMuted(muted: Writable<boolean>) {
    this.unsubscribeMuted?.call(this);
    this.unsubscribeMuted = this.muted.subscribe((value) => muted.set(value));
  }

  public bindSubtitles(subtitles: Writable<SubtitlesMeta>) {
    this.unsubscribeSubtitles?.call(this);
    this.unsubscribeSubtitles = this.subtitles.subscribe((value) => subtitles.set(value));
  }

  public bindFullscreen(fullscreen: Writable<boolean>) {
    this.unsubscribeFullscreen?.call(this);
    this.unsubscribeFullscreen = this.fullscreen.subscribe((value) => fullscreen.set(value));
  }

  // * * * * * * * * * * * * * * * *
  // State methods

  get element(): HTMLMediaElement {
    return this._element as HTMLMediaElement;
  }

  get src(): Nullable<string> {
    return this.source;
  }

  public isLoaded(): boolean {
    if (!this.hasElementBound()) return false;
    return this.element.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA;
  }

  private hasElementBound() {
    return this.element != null;
  }

  get $duration() {
    return get(this.duration);
  }

  get $durationString() {
    return get(this.durationString);
  }

  get $time() {
    return get(this.time);
  }

  get $timeString() {
    return get(this.timeString);
  }

  get $paused() {
    return get(this.paused);
  }

  get $ended() {
    return get(this.ended);
  }

  get $volume() {
    return get(this.volume);
  }

  get $muted() {
    return get(this.muted);
  }

  get $fullscreen() {
    return get(this.fullscreen);
  }

  get $subtitle() {
    return get(this.subtitle);
  }

  get $subtitles() {
    return get(this.subtitles);
  }

  get audioTracks(): Nullable<NamedAudioTrackList> {
    if (!this.element) return null;
    const tracks: AudioTrackList = this.element['audioTracks'];
    let index = 1;
    for (const track of tracks) {
      track.name = !track.language || track.language === 'und' ? `Track ${index++}` : track.label;
    }
    return tracks as NamedAudioTrackList;
  }

  get videoTracks(): Nullable<NamedVideoTrackList> {
    if (!this.element) return null;
    const tracks: VideoTrackList = this.element['videoTracks'];
    let index = 1;
    for (const track of tracks) {
      track.name = !track.language || track.language === 'und' ? `Track ${index++}` : track.label;
    }
    return tracks as NamedVideoTrackList;
  }

  get selectedVideoTracks(): Nullable<NamedVideoTrack> {
    if (!this.videoTracks) return null;
    for (const track of this.videoTracks) {
      if (track.selected) return track;
    }
    return null;
  }

  get selectedAudioTracks(): Nullable<NamedAudioTrack> {
    if (!this.audioTracks) return null;
    for (const track of this.audioTracks) {
      if (track.enabled) return track;
    }
    return null;
  }

  // * * * * * * * * * * * * * * * *
  // Playback methods

  // TODO: consider readyState: only play if loaded,
  // otherwise add loaded event listener once
  public play() {
    if (!this.isLoaded()) return;
    this.paused.set(false);
    this.ended.set(false);
    this.element.play();
  }

  public pause() {
    if (!this.isLoaded()) return;
    this.paused.set(true);
    this.element.pause();
  }

  public seek(time: Time) {
    if (!this.isLoaded()) return;
    this.element.currentTime = time;
    if (this.$ended) this.play();
  }

  public setVolume(volumePercentage: number) {
    if (!this.hasElementBound()) return;
    this.volume.set(volumePercentage);
    this.element.volume = volumePercentage / 100;
  }

  public setPlaybackRate(rate: number) {
    if (rate <= 0 || rate > 2) return;
    if (!this.hasElementBound()) return;
    this.element.playbackRate = rate;
    this.element.defaultPlaybackRate = rate;
  }

  public mute() {
    if (!this.hasElementBound()) return;
    this.muted.set(true);
    this.element.muted = true;
  }

  public unmute() {
    if (!this.hasElementBound()) return;
    this.muted.set(false);
    this.element.muted = false;
  }

  public toggleSubtitle() {
    if (this.$subtitle) {
      activeSubtitleMeta.set(null);
      return;
    }

    activeSubtitleMeta.set(this.lastChosenSubtitleMeta);
  }

  public freezeTimeUpdate() {
    this.timeUpdateFrozen = true;
  }

  public unfreezeTimeUpdate() {
    this.timeUpdateFrozen = false;
  }

  public updateSubtitleDisplay() {
    if (!this.$subtitle) return;

    const time = this.$time;
    let line: Nullable<string> = null;
    for (const entry of this.$subtitle.lines) {
      if (entry.pts + entry.duration < time) {
        continue;
      }

      if (time < entry.pts) {
        line = '';
        break;
      }

      line = entry.text;
      break;
    }

    if (line) this.subtitleDisplay.set(line);
  }

  public chooseVideoTrack(id: string) {
    if (this.videoTracks) {
      const selectedTrack = this.videoTracks.getTrackById(id);
      if (selectedTrack) {
        selectedTrack.selected = true;
        // TODO: test if the video continues properly (not paused),
        // otherwise uncomment this line
        // this.seek(this.$time);
      }
    }
  }

  public chooseAudioTrack(id: string) {
    if (this.audioTracks) {
      const selectedTrack = this.audioTracks.getTrackById(id);

      if (selectedTrack?.enabled) return;

      if (selectedTrack) {
        for (const track of this.audioTracks) {
          track.enabled = track === selectedTrack;
        }
        // ? Workaround for freezing video after active audio track gets disabled
        this.seek(this.$time);
      }
    }
  }

  // * * * * * * * * * * * * * * * *
  // Event methods

  private onEnded() {
    this.ended.set(true);
    this.time.set(this.$duration);
  }

  private onTimeUpdated() {
    this.time.set(this.element.currentTime);
  }

  public onLoaded(callback: () => unknown) {
    this.loadedCallbacks.push(callback);
  }

  // * * * * * * * * * * * * * * * *
  // Metadata methods

  private refreshConfig() {
    this.duration.set(this.element.duration);
  }

  private async discoverSubtitles() {
    await this.discoverEmbeddedSubtitles();
    await this.discoverExternalSubtitles();
    const subtitles = this.$subtitles;

    if (subtitles.embedded.length > 0) {
      this.lastChosenSubtitleMeta = subtitles.embedded[0];
      return;
    }

    if (subtitles.external.length > 0) {
      this.lastChosenSubtitleMeta = subtitles.external[0];
    }
  }

  private async discoverEmbeddedSubtitles() {
    if (this.source) {
      const streams = await invoke<Streams>('discover_streams', {
        path: this.source
      });

      this.subtitles.update((subtitles) => {
        subtitles.embedded = streams.subtitle;
        return subtitles;
      });
    }
  }

  private async discoverExternalSubtitles() {
    if (this.source) {
      const dir = await dirname(this.source);
      const files = await readDir(dir);
      const externalSubtitles: ExternalSubtitleMeta[] = [];

      for (const filePath of files) {
        if (filePath.children) continue;
        const ext = await extname(filePath.path);
        const base = await basename(
          filePath.name ?? 'Unknown',
          filePath.name ? `.${ext}` : undefined
        );
        if (isSubtitleSupported(ext)) {
          externalSubtitles.push({
            basename: base,
            ext,
            path: filePath.path
          });
        }
      }

      this.subtitles.update((subtitles) => {
        subtitles.external = externalSubtitles;
        return subtitles;
      });
    }
  }

  public useSource(path: string) {
    this.source = path;
    this.element.src = convertFileSrc(path);
  }
}
