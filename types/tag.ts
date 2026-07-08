export interface Tag {
  _id: string;
  name: string;
  color: string;
  createdBy: string | { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}
