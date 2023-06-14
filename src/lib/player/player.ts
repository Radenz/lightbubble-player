import { toDurationString, type Nullable } from '$lib/util';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { readDir } from '@tauri-apps/api/fs';
import { dirname, extname, basename } from '@tauri-apps/api/path';
import { derived, writable, type Unsubscriber, type Writable, get } from 'svelte/store';
import { SUPPORTED_SUBTITLE_FORMATS, type SubtitleMeta } from './subtitle';
import * as HotkeyRegistry from '$lib/keyboard/hotkey';
import { appWindow } from '@tauri-apps/api/window';

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

  private time = writable(0);
  private unsubscribeTime: Nullable<Unsubscriber> = null;

  public timeString = derived(this.time, (time) => toDurationString(Math.round(time)));
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

  private subtitles = writable({
    external: [],
    embedded: []
  });
  private unsubscribeSubtitles: Nullable<Unsubscriber> = null;

  private source: Nullable<string> = null;

  // * * * * * * * * * * * * * * * *
  // Construction

  constructor() {
    this.registerHotkeys();
  }

  private registerHotkeys() {
    HotkeyRegistry.register('M', () => {
      get(this.muted) ? this.unmute() : this.mute();
    });
    HotkeyRegistry.register('F', () => {
      get(this.fullscreen) ? this.exitFullscreen() : this.setFullscreen();
    });
    HotkeyRegistry.register('Space', () => {
      get(this.paused) || get(this.ended) ? this.play() : this.pause();
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

  public bindFullscreen(fullscreen: Writable<boolean>) {
    this.unsubscribeFullscreen?.call(this);
    this.unsubscribeFullscreen = this.fullscreen.subscribe((value) => fullscreen.set(value));
  }

  // * * * * * * * * * * * * * * * *
  // State methods

  get element(): HTMLMediaElement {
    return this._element as HTMLMediaElement;
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
  }

  public setVolume(volumePercentage: number) {
    if (!this.hasElementBound()) return;
    this.volume.set(volumePercentage);
    this.element.volume = volumePercentage / 100;
  }

  // set volume(volumePercentage: number) {
  //   if (!this.hasElementBound()) return;
  //   this.element.volume = volumePercentage / 100;
  // }

  // get volume(): number {
  //   return Math.round(this.element.volume * 100);
  // }

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

  public freezeTimeUpdate() {
    this.timeUpdateFrozen = true;
  }

  public unfreezeTimeUpdate() {
    this.timeUpdateFrozen = false;
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

  // * * * * * * * * * * * * * * * *
  // Metadata methods

  private refreshConfig() {
    this.duration.set(this.element.duration);
  }

  private discoverSubtitles() {
    this.discoverExternalSubtitles();
    // TODO: dicover embedded subtitles
  }

  private async discoverExternalSubtitles() {
    if (this.source) {
      const dir = await dirname(this.source);
      const files = await readDir(dir);
      const subtitles: SubtitleMeta[] = [];

      for (const filePath of files) {
        const ext = await extname(filePath.path);
        const base = await basename(filePath.name ?? 'Unknown');
        if (SUPPORTED_SUBTITLE_FORMATS.includes(ext)) {
          subtitles.push({
            basename: base,
            ext,
            path: filePath.path
          });
        }
      }
    }
  }

  public useSource(path: string) {
    this.source = path;
    this.element.src = convertFileSrc(path);
  }
}
