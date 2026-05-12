import { MusicNotesIcon, XIcon } from '@phosphor-icons/react'
import {
  AudioPlayer,
  AudioPlayerControlBar,
  AudioPlayerDurationDisplay,
  AudioPlayerElement,
  AudioPlayerMuteButton,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerVolumeRange,
} from '@/components/ai-elements/audio-player'

interface AudioPlayerModalProps {
  src: string
  name: string
  onClose: () => void
}

export function AudioPlayerModal({ src, name, onClose }: AudioPlayerModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--surface-elevated)] shadow-2xl ring-1 ring-white/8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Audio player"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--muted-surface)]">
            <MusicNotesIcon className="h-4 w-4 text-[var(--muted-strong)]" weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[13px] font-semibold leading-snug text-[var(--foreground)]"
              title={name}
            >
              {name}
            </p>
            <p className="text-[11px] text-[var(--muted)]">Audio recording</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--muted-surface)] hover:text-[var(--foreground)]"
            aria-label="Close player"
          >
            <XIcon className="h-4 w-4" weight="bold" />
          </button>
        </div>

        {/* Player */}
        <div className="px-4 py-4">
          <AudioPlayer>
            <AudioPlayerElement src={src} />
            <AudioPlayerControlBar>
              <AudioPlayerPlayButton />
              <AudioPlayerSeekBackwardButton seekOffset={10} />
              <AudioPlayerSeekForwardButton seekOffset={10} />
              <AudioPlayerTimeDisplay />
              <AudioPlayerTimeRange />
              <AudioPlayerDurationDisplay />
              <AudioPlayerMuteButton />
              <AudioPlayerVolumeRange />
            </AudioPlayerControlBar>
          </AudioPlayer>
        </div>
      </div>
    </div>
  )
}
