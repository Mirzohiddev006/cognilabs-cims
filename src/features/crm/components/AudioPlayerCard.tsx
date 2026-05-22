import { useEffect, useRef, useState } from 'react'
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon, MusicNotesIcon } from '@phosphor-icons/react'
import {
  AudioPlayer,
  AudioPlayerControlBar,
  AudioPlayerDurationDisplay,
  AudioPlayerElement,
  AudioPlayerMuteButton,
  AudioPlayerPlayButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerVolumeRange,
} from '@/components/ai-elements/audio-player'
import { cn } from '@/shared/lib/cn'

interface AudioPlayerCardProps {
  src: string
  name: string
}

const seekBtnClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--muted-strong) transition hover:bg-(--muted-surface) hover:text-(--foreground) active:scale-95'

export function AudioPlayerCard({ src, name }: AudioPlayerCardProps) {
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
    audio.addEventListener('seeked', onResume)

    return () => {
      audio.removeEventListener('progress', updateBuffered)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onResume)
      audio.removeEventListener('canplay', onResume)
      audio.removeEventListener('seeked', onResume)
    }
  }, [])

  function seek(delta: number) {
    const audio = audioRef.current
    if (!audio || !isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta))
  }

  return (
    <div className="rounded-2xl bg-(--surface-elevated) ring-1 ring-white/8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-(--border) px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--muted-surface)">
          <MusicNotesIcon className="h-4 w-4 text-(--muted-strong)" weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-snug text-(--foreground)" title={name}>
            {name}
          </p>
          <p className="text-[11px] text-(--muted)">Audio recording</p>
        </div>
      </div>

      {/* Player */}
      <div className="px-4 py-4">
        <AudioPlayer>
          <AudioPlayerElement src={src} ref={audioRef} preload="auto" />
          <AudioPlayerControlBar>
            <AudioPlayerPlayButton />

            <button
              type="button"
              onClick={() => seek(-10)}
              className={seekBtnClass}
              aria-label="10 soniya orqaga"
              title="-10s"
            >
              <span className="relative flex items-center justify-center">
                <ArrowCounterClockwiseIcon className="h-5 w-5" weight="bold" />
                <span className="absolute text-[8px] font-bold leading-none" style={{ marginTop: 1 }}>10</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => seek(10)}
              className={seekBtnClass}
              aria-label="10 soniya oldinga"
              title="+10s"
            >
              <span className="relative flex items-center justify-center">
                <ArrowClockwiseIcon className="h-5 w-5" weight="bold" />
                <span className="absolute text-[8px] font-bold leading-none" style={{ marginTop: 1 }}>10</span>
              </span>
            </button>

            <AudioPlayerTimeDisplay />
            <AudioPlayerTimeRange />
            <AudioPlayerDurationDisplay />
            <AudioPlayerMuteButton />

            {isBuffering && (
              <span className={cn('min-w-7.5 text-right text-[10px] tabular-nums text-(--muted)', bufferedPct < 100 && 'animate-pulse')}>
                {bufferedPct}%
              </span>
            )}

            <AudioPlayerVolumeRange />
          </AudioPlayerControlBar>
        </AudioPlayer>
      </div>
    </div>
  )
}
