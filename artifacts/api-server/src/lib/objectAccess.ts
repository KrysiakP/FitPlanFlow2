/**
 * Who may open a stored file through /objects/... (progress photos are body photos: only the client and their trainer).
 * Public files (exercise videos, profile pictures) stay readable by any signed-in user.
 */

export interface ObjectAccessInput {
  userId: string | undefined;
  visibility: "public" | "private" | undefined;
  ownerId: string | undefined; // owner recorded in the file's ACL
  reportPhotoOwnerId: string | null; // set when the file is a weekly-report photo, whatever its ACL says (older photos are still "public")
  userIsTrainerOfOwner: boolean;
  chatParticipant?: boolean; // the file is an image of a chat message the user sent or received
}

export function canOpenObject(input: ObjectAccessInput): boolean {
  if (!input.userId) return false;
  if (input.chatParticipant) return true;
  const protectedOwner = input.reportPhotoOwnerId ?? (input.visibility === "private" ? input.ownerId : undefined);
  if (protectedOwner) return input.userId === protectedOwner || input.userIsTrainerOfOwner;
  return input.visibility === "public";
}
