import mongoose, { Schema, Document } from 'mongoose';

export interface IUserChannel extends Document {
  user_id: number;
  username?: string;
  channel_id: number;
  channel_access_hash?: string;
  channel_title?: string;
  created_at: Date;
}

const UserChannelSchema = new Schema<IUserChannel>({
  user_id: {
    type: Number,
    required: true,
    index: true,
  },
  username: {
    type: String,
    required: false,
  },
  channel_id: {
    type: Number,
    required: true,
    unique: true,
  },
  channel_access_hash: {
    type: String,
    required: false,
  },
  channel_title: {
    type: String,
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

UserChannelSchema.index({ user_id: 1, channel_id: 1 });

export const UserChannel = mongoose.model<IUserChannel>('UserChannel', UserChannelSchema);
