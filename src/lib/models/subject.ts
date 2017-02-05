/**
 * The Subject interface is used for authorizing subjects.
 *
 * @export
 * @interface Subject
 */
export interface Subject {
  _id?: string;
  email?: string;
  /** Display name or last name */
  name?: string;
  /** Is the user an admin */
  admin?: boolean;
  /** Whether the email (user) has been verified */
  verified?: boolean;
  /** Did the user subscribe to receive news, or did he pay */
  subscribed?: boolean;
  /** Timestamp the account was created */
  createdAt?: Date;
  /** Role the user has */
  role?: string[];
  /**
   * Data object, to store application specific user data.
   * Typically, a developer would extend the IUser interface to specify the data properties in IMyAppUser.
   */
  data?: Object;
};
