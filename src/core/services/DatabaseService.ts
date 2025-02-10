import { IDatabaseService } from '../../interfaces/IDatabaseService';
import mongoose, { Schema, model } from 'mongoose';

const UploadRecordSchema = new Schema({
  fileId: { type: String, required: true },
  filePath: { type: String, required: true },
  userId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  status: { type: String, required: true },
});

const UploadRecordModel = model('UploadRecord', UploadRecordSchema);

export class DatabaseService implements IDatabaseService {
  constructor() {
    mongoose.connect(process.env.MONGO_URI!, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  public async saveRecord(record: any): Promise<void> {
    const newRecord = new UploadRecordModel(record);
    await newRecord.save();
  }

  public async getRecordsByUser(userId: string): Promise<any[]> {
    try {
      return await UploadRecordModel.find({ userId }).exec();
    } catch (error) {
      console.error('❌ Erro ao buscar vídeos do usuário:', error);
      throw new Error('Erro ao recuperar vídeos.');
    }
  }

  public async updateVideoStatus(userId: string, fileId: string, status: string): Promise<void> {
    try {
      const result = await UploadRecordModel.updateOne(
        { userId, fileId },
        { $set: { status } }
      );

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Nenhum vídeo encontrado para userId: ${userId}, fileId: ${fileId}`);
      } else {
        console.log(`✅ Status do vídeo (${fileId}) atualizado para "${status}"`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status do vídeo:', error);
      throw new Error('Erro ao atualizar status do vídeo.');
    }
  }
}
