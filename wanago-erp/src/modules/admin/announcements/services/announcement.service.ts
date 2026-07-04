import { fetchChannels, sendMessage } from "@/modules/teamspace/services/teamspace.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";

export async function broadcastAnnouncement(
  text: string,
  officeIds: string[],
  senderId: string,
  senderName: string
): Promise<number> {
  const targetOfficeIds = officeIds.length > 0
    ? officeIds
    : (await fetchOffices()).map(o => o.id);

  let sentCount = 0;
  for (const officeId of targetOfficeIds) {
    const channels = await fetchChannels(officeId);
    const announcementChannel = channels.find(c => c.type === "announcement") ?? channels[0];
    if (announcementChannel) {
      await sendMessage(announcementChannel.id, "channel", text, senderId, senderName, officeId);
      sentCount++;
    }
  }
  return sentCount;
}
