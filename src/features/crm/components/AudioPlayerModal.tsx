import { useEffect } from 'react'
import {
  FastForwardIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerSlashIcon,
  SpinnerGapIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useAudioProvider } from '@/shared/hooks/use-audio-provider'
import { useAudioStore } from '@/shared/lib/audio/audio-store'
import { formatDuration } from '@/shared/lib/audio/html-audio'
import { Transport } from '@/shared/ui/audio/elements/transport'
import { Fader } from '@/shared/ui/audio/elements/fader'
import { cn } from '@/shared/lib/cn'

interface AudioPlayerModalProps {
  src: string
  name: string
  onClose: () => void
}

export function AudioPlayerModal({ src, name, onClose }: AudioPlayerModalProps) {
  useAudioProvider()

  const isPlaying = useAudioStore((s) => s.isPlaying)
  const isLoading = useAudioStore((s) => s.isLoading)
  const isBuffering = useAudioStore((s) => s.isBuffering)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration = useAudioStore((s) => s.duration)
  const bufferedTime = useAudioStore((s) => s.bufferedTime)
  const progress = useAudioStore((s) => s.progress)
  const volume = useAudioStore((s) => s.volume)
  const isMuted = useAudioStore((s) => s.isMuted)

  const togglePlay = useAudioStore((s) => s.togglePlay)
  const seek = useAudioStore((s) => s.seek)
  const setVolume = useAudioStore((s) => s.setVolume)
  const toggleMute = useAudioStore((s) => s.toggleMute)

  useEffect(() => {
    useAudioStore.getState().setCurrentTrack({ id: src, url: src, title: name })
  }, [src, name])

  useEffect(() => {
    return () => { useAudioStore.getState().pause() }
  }, [])

  const bufferedProgress = duration > 0 ? (bufferedTime / duration) * 100 : 0
  const remaining = duration - currentTime
  const effectiveVolume = isMuted ? 0 : volume
  const showSpinner = isLoading || isBuffering

  const VolumeIcon = effectiveVolume === 0
    ? SpeakerSlashIcon
    : effectiveVolume < 0.33
      ? SpeakerNoneIcon
      : effectiveVolume < 0.66
        ? SpeakerLowIcon
        : SpeakerHighIcon

  return (
    <div
      className={cn(
        'fixed right-6 bottom-6 z-[200] w-[300px]',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:backdrop-blur-xl before:backdrop-saturate-150',
        'rounded-4xl py-4',
        'bg-card/80 shadow-xl ring-1 ring-foreground/8',
      )}
      role="dialog"
      aria-label="Audio player"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <MusicNotesIcon className="h-4 w-4 text-primary" weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-snug text-[var(--foreground)]" title={name}>{name}</p>
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

      {/* Seek bar */}
      <div className="px-4 pb-1">
        <Transport
          value={progress}
          bufferedValue={bufferedProgress}
          onSeek={(nextProgress) => {
            if (duration > 0) seek((nextProgress / 100) * duration)
          }}
          size="sm"
          aria-label="Seek"
          className="min-w-0"
        />
        <div className="mt-1.5 flex justify-between text-[11px] font-medium tabular-nums text-[var(--muted)]">
          <time>{formatDuration(currentTime)}</time>
          <time>-{formatDuration(remaining >= 0 ? remaining : 0)}</time>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1 px-4 py-1">
        <button
          type="button"
          onClick={() => { if (duration > 0) seek(Math.max(0, currentTime - 10)) }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-strong)] transition hover:bg-[var(--muted-surface)] hover:text-primary"
          aria-label="Rewind 10 seconds"
        >
          <RewindIcon className="h-5 w-5" weight="fill" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          disabled={showSpinner}
          className="mx-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] shadow-md transition hover:opacity-90 active:scale-95 disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {showSpinner
            ? <SpinnerGapIcon className="h-5 w-5 animate-spin" weight="bold" />
            : isPlaying
              ? <PauseIcon className="h-5 w-5" weight="fill" />
              : <PlayIcon className="ml-0.5 h-5 w-5" weight="fill" />
          }
        </button>

        <button
          type="button"
          onClick={() => { if (duration > 0) seek(Math.min(duration, currentTime + 10)) }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-strong)] transition hover:bg-[var(--muted-surface)] hover:text-primary"
          aria-label="Fast forward 10 seconds"
        >
          <FastForwardIcon className="h-5 w-5" weight="fill" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 px-4 pt-1">
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--muted-surface)] hover:text-primary"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <VolumeIcon className="h-4 w-4" />
        </button>
        <Fader
          min={0}
          max={100}
          value={Math.round(effectiveVolume * 100)}
          onValueChange={(val) => setVolume({ volume: val / 100 })}
          orientation="horizontal"
          size="sm"
          thumbMarks={1}
          className="flex-1"
          aria-label="Volume"
        />
        <span className="w-7 flex-shrink-0 text-right text-[10px] tabular-nums font-medium text-[var(--muted)]">
          {Math.round(effectiveVolume * 100)}
        </span>
      </div>
    </div>
  )
}
