import { NextFunction } from 'express';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as bluebird from 'bluebird';

(<any>mongoose).Promise = bluebird;
const Schema = mongoose.Schema;

/**
 * The IUser object is typically used in the client, as it contains no methods, and can therefore be send around like a regular POJO.
 *
 * @export
 * @interface IUser
 */
export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  /** first name */
  first?: string;
  /** Display name or last name */
  name?: string;
  /** Is the user an admin */
  admin?: boolean;
  /** Whether the email (user) has been verified */
  verified?: boolean;
  /** Did the user subscribe to receive news, or did he pay */
  subscribed?: boolean;
  /** When does the subscription expire */
  expires?: Date;
  /** Timestamp the account was created */
  createdAt: Date;
  /**
   * Data object, to store application specific user data.
   * Typically, a developer would extend the IUser interface to specify the data properties in IMyAppUser.
   */
  data?: Object;
};

/**
 * The IUserModel is based on the IUser, but also contains all Mongoose functionality.
 *
 * @export
 * @interface IUserModel
 * @extends {IUser}
 * @extends {mongoose.Document}
 */
export interface IUserModel extends IUser, mongoose.Document {
  comparePassword: (pwd: string, callback: (err: Error, isMatch: boolean) => void) => void;
}

// Regex to verify emails: http://emailregex.com/
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Validate the email address usuing a regex
 * Source: http://emailregex.com/
 *
 * @param {string} email
 * @returns
 */
export function validateEmailAddress(email: string) {
  return emailRegex.test(email);
}

const UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    dropDups: true,
    validate: {
      validator: (email, cb) => {
        if (!validateEmailAddress(email)) { cb(false); }
        User.find({ email: email }, (err, docs) => {
          cb(docs.length === 0);
        });
      },
      message: 'User already exists!'
    }
  },
  password: String,
  first: String,
  name: String,
  admin: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  subscribed: {
    type: Boolean,
    default: false
  },
  expires: {
    type: Date,
    // Default: expires in one year
    default: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  data: Object
}, {
    versionKey: false
  });

UserSchema.pre('save', function (next: NextFunction) {
  const now = new Date();
  let user: IUser = this;
  if (!user.createdAt) {
    user.createdAt = now;
  }
  if (user.password && this.isModified('password') || this.isNew) {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) {
          return next(err);
        }
        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

UserSchema.methods.comparePassword = function (pwd: string, cb: Function) {
  bcrypt.compare(pwd, this.password, (err, isMatch) => {
    if (err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

/**
 * The server side User class, with additional Mongoose functionality to save it.
 */
export const User = mongoose.model<IUserModel>('User', UserSchema);

