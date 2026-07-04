export type TrashEntry = {
  id:             string;
  collectionName: string;
  originalId:     string;
  data:           Record<string, unknown>;
  deletedAt:      unknown;
};
