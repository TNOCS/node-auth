export enum Action {
  none = 0,
  create = 1,
  read = 2,
  update = 4,
  delete = 8,
  author = read + update,
  manage = author + create + Action.delete,
  approve = 16,
  assign = 32,
  delegate = 64,
  all = manage + approve + assign + delegate
}
