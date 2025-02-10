export interface IDatabaseService {
  saveRecord(record: any): Promise<void>;
  getRecordsByUser(userId: string): Promise<any[]>;
  updateVideoStatus(userId: string, fileId: string, status: string): Promise<void>; // 🔹 Novo método
}
