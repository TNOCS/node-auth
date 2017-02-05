export enum Action {
  None = 0,
  Create = 1,
  Read = 2,
  Update = 4,
  Delete = 8,
  Author = Read + Update,
  Manage = Author + Create + Action.Delete,
  Approve = 16,
  Assign = 32,
  Delegate = 64,
  Sign = 128,
  All = Manage + Approve + Assign + Delegate + Sign
}
