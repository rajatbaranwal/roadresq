import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true }, // ✅ Add this line
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'mechanic'],
    default: 'user'
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
