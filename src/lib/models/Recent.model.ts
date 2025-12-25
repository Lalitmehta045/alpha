import mongoose, { Schema } from "mongoose";

export interface IRecent {
  _id?: string;
  image: string;
  title?: string;
  description?: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const RecentSchema = new Schema<IRecent>(
  {
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const RecentModel = mongoose.models.Recent || mongoose.model<IRecent>("Recent", RecentSchema);

export default RecentModel;