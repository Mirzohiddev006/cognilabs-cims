import { useRef, useState, type PropsWithChildren } from 'react'
import {
  ConfirmDialogContext,
  type ConfirmOptions,
} from './ConfirmDialogContext'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'

const toneClassName = {
  default: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function ConfirmDialogProvider({ children }: PropsWithChildren) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  function closeWith(result: boolean) {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }

  function confirm(nextOptions: ConfirmOptions) {
    setOptions(nextOptions)

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={Boolean(options)}
        onClose={() => closeWith(false)}
        title={options?.title ?? 'Confirm action'}
        description={options?.description}
        footer={
          <>
            <Button variant="secondary" onClick={() => closeWith(false)}>
              {options?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              className={toneClassName[options?.tone ?? 'default']}
              onClick={() => closeWith(true)}
            >
              {options?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      />
    </ConfirmDialogContext.Provider>
  )
}
