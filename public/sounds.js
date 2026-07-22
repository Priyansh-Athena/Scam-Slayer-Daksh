(() => {
	"use strict";

	class SoundSystem {
		constructor() {
			this.audioContext = null;
			this.enabled = true;
			this.volume = 0.2;
			this.sounds = {
				correct: () => this.playSequence([523, 659, 784], 0.16, "sine", 0.06),
				incorrect: () => this.playSequence([247, 196, 165], 0.18, "triangle", 0.08),
				timer: () => this.playSequence([440], 0.045, "sine"),
				timerWarning: () => this.playSequence([880, 660], 0.07, "triangle", 0.05),
				gameStart: () => this.playSequence([262, 330, 392, 523], 0.12, "sine", 0.07),
				gameEnd: () => this.playSequence([392, 523, 659, 784], 0.16, "sine", 0.09),
				playerJoin: () => this.playSequence([392, 523], 0.09, "sine", 0.05),
				buttonClick: () => this.playSequence([660], 0.035, "sine"),
			};

			document.addEventListener("pointerdown", () => this.ensureContext(), {
				once: true,
				passive: true,
			});
		}

		ensureContext() {
			if (!this.audioContext) {
				const AudioContextClass = window.AudioContext || window.webkitAudioContext;
				if (!AudioContextClass) return null;
				this.audioContext = new AudioContextClass();
			}
			if (this.audioContext.state === "suspended") {
				this.audioContext.resume().catch(() => {});
			}
			return this.audioContext;
		}

		playSequence(frequencies, duration, type = "sine", gap = 0) {
			if (!this.enabled) return;
			const context = this.ensureContext();
			if (!context) return;

			frequencies.forEach((frequency, index) => {
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				const start = context.currentTime + index * (duration + gap);
				const end = start + duration;

				oscillator.type = type;
				oscillator.frequency.setValueAtTime(frequency, start);
				gain.gain.setValueAtTime(0.0001, start);
				gain.gain.exponentialRampToValueAtTime(this.volume, start + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, end);
				oscillator.connect(gain);
				gain.connect(context.destination);
				oscillator.start(start);
				oscillator.stop(end + 0.01);
			});
		}

		play(name) {
			const sound = this.sounds[name];
			if (sound) sound();
		}

		toggle() {
			this.enabled = !this.enabled;
			if (this.enabled) this.ensureContext();
			return this.enabled;
		}
	}

	window.soundSystem = new SoundSystem();
})();
