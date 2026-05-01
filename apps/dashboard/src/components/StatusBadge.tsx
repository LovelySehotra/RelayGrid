import type { EventStatus } from '../types';

interface Props { status: EventStatus; }

const MAP: Record<EventStatus, string> = {
  delivered: 'badge badge-delivered',
  failed: 'badge badge-failed',
  dead: 'badge badge-dead',
  queued: 'badge badge-queued',
  received: 'badge badge-received',
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className={MAP[status]}>
      <span className="badge-dot" />
      {status.toUpperCase()}
    </span>
  );
}
