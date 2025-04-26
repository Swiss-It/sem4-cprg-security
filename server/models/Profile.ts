import { Model, Schema, Document } from 'mongoose';
import mongoose from 'mongoose';

export interface IProfile extends Document {
  userId: string;
  name: string;
  email: string;
  bio: string;
}