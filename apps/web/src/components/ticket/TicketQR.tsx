import { QRCodeSVG } from 'qrcode.react';
import { encodeTicketQr } from '@tessera/sdk';
import { CONTRACT_ID } from '../../lib/config';

export function TicketQR({
  ticketId,
  owner,
  size = 160,
}: {
  ticketId: number;
  owner: string;
  size?: number;
}) {
  const value = encodeTicketQr({ c: CONTRACT_ID, t: ticketId, o: owner });
  return (
    <div className="rounded-xl bg-white p-2.5">
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#0b0a18" />
    </div>
  );
}
