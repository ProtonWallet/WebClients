import type { InternalEventInterface } from './InternalEventInterface'

export interface InternalEventHandlerInterface {
  handleEvent(event: InternalEventInterface): Promise<void>
}
