import { useEffect, useRef, useState } from 'react'
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
  const audioRef = useRef<HTMLAudioElement>(null)
  const [bufferedPct, setBufferedPct] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateBuffered = () => {
      if (audio.buffered.length > 0 && audio.duration > 0) {
        setBufferedPct(Math.round((audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100))
      }
    }
    const onWaiting = () => setIsBuffering(true)
    const onResume = () => setIsBuffering(false)

    audio.addEventListener('progress', updateBuffered)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onResume)
    audio.addEventListener('canplay', onResume)

    return () => {
      audio.removeEventListener('progress', updateBuffered)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onResume)
      audio.removeEventListener('canplay', onResume)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-(--surface-elevated) shadow-2xl ring-1 ring-white/8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Audio player"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-(--border) px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--muted-surface)">
            <MusicNotesIcon className="h-4 w-4 text-(--muted-strong)" weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[13px] font-semibold leading-snug text-(--foreground)"
              title={name}
            >
              {name}
            </p>
            <p className="text-[11px] text-(--muted)">Audio recording</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-(--muted) transition hover:bg-(--muted-surface) hover:text-(--foreground)"
            aria-label="Close player"
          >
            <XIcon className="h-4 w-4" weight="bold" />
          </button>
        </div>

        {/* Player */}
        <div className="px-4 py-4">
          <AudioPlayer>
            <AudioPlayerElement src={src} ref={audioRef} />
            <AudioPlayerControlBar>
              <AudioPlayerPlayButton />
              <AudioPlayerSeekBackwardButton seekOffset={10} />
              <AudioPlayerSeekForwardButton seekOffset={10} />
              <AudioPlayerTimeDisplay />
              <AudioPlayerTimeRange />
              <AudioPlayerDurationDisplay />
              <AudioPlayerMuteButton />
              {isBuffering && (
                <span className="min-w-7.5 text-right text-[10px] tabular-nums text-(--muted)">
                  {bufferedPct}%
                </span>
              )}
              <AudioPlayerVolumeRange />
            </AudioPlayerControlBar>
          </AudioPlayer>
        </div>
      </div>
    </div>
  )
}
