import { toDurationString, type Listener, type ListenerMap, type Nullable } from '$lib/util';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { derived, readonly, writable } from 'svelte/store';

type Time = number;

export class Player {
  private _duration = writable(-1);
  public duration = readonly(this._duration);
  public durationString = derived(this._duration, (duration) =>
    toDurationString(Math.max(Math.round(duration), 0))
  );

  private _time = writable(0);
  public time = readonly(this._time);
  public timeString = derived(this._time, (time) => toDurationString(Math.round(time)));

  private _paused = writable(true);
  public paused = readonly(this._paused);

  private _ended = writable(false);
  public ended = readonly(this._ended);

  private _muted = writable(false);
  public muted = readonly(this._muted);

  private _subtitles = writable({
    external: [],
    embedded: []
  });
  public subtitles = readonly(this._subtitles);

  private source: Nullable<string> = null;

  constructor(private element: HTMLMediaElement) {
    element.addEventListener('loadedmetadata', () => {
      this._paused.set(false);
      this.refreshConfig();
    });
    element.addEventListener('timeupdate', async () => {
      this._onTimeUpdated();
    });

    element.addEventListener('ended', () => {
      this.onEnded();
    });
  }

  // * * * * * * * * * * * * * * * *
  // State methods

  public isLoaded() {
    return this.element.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA;
  }

  // * * * * * * * * * * * * * * * *
  // Playback methods

  // TODO: consider readyState: only play if loaded,
  // otherwise add loaded event listener once
  public play() {
    this._paused.set(false);
    this._ended.set(false);
    this.element.play();
  }

  public pause() {
    this._paused.set(true);
    this.element.pause();
  }

  public seek(time: Time) {
    this.element.currentTime = time;
  }

  set volume(volumePercentage: number) {
    this.element.volume = volumePercentage / 100;
  }

  get volume(): number {
    return Math.round(this.element.volume);
  }

  public mute() {
    this._muted.set(true);
    this.element.muted = true;
  }

  public unmute() {
    this._muted.set(false);
    this.element.muted = false;
  }

  // * * * * * * * * * * * * * * * *
  // Event methods

  private onEnded() {
    this._ended.set(true);
  }

  private _onTimeUpdated() {
    this._time.set(this.element.currentTime);
  }

  // * * * * * * * * * * * * * * * *
  // Metadata methods

  private refreshConfig() {
    this._duration.set(this.element.duration);
  }

  private loadSubtitles() {
    this.discoverExternalSubtitles();
    // TODO: dicover embedded subtitles
  }

  private discoverExternalSubtitles() {
    //
  }

  public useSource(path: string) {
    this.source = path;
    this.element.src = convertFileSrc(path);
  }
}
