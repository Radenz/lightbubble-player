import { toDurationString, type Listener, type ListenerMap } from '$lib/util';
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

	private pausedListeners: ListenerMap<void> = {};

	private pausedListenersIndex = -1;

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
		return this.el.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA;
	}

	// * * * * * * * * * * * * * * * *
	// Playback methods

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

	get el() {
		return this.element;
	}

	// * * * * * * * * * * * * * * * *
	// Event methods

	private onEnded() {
		this._ended.set(true);
	}

	// TODO: refactor using generic listener container

	public onPaused(listener: Listener<void>): number {
		this.pausedListenersIndex += 1;
		this.pausedListeners[this.pausedListenersIndex] = listener;
		return this.pausedListenersIndex;
	}

	public removePausedListener(listenerDescriptor: number) {
		delete this.pausedListeners[listenerDescriptor];
	}

	public removeEndedListener(listenerDescriptor: number) {
		delete this.removeEndedListener[listenerDescriptor];
	}

	private refreshConfig() {
		this._duration.set(this.element.duration);
	}

	private _onTimeUpdated() {
		this._time.set(this.element.currentTime);
	}
}
